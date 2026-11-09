#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    objectid: number;
    baumgattunglat: string | null;
    baumartlat: string | null;
    status: string;
    kategorie: string;
    baumtyptext: string;
  };
}

// Stadt Zürich / Grün Stadt Zürich, Baumkataster, CC0:
// https://data.stadt-zuerich.ch/api/3/action/package_show?id=geo_baumkataster
// Streets, selected public gardens/private trees and nearby managed orchards;
// not complete forest/private coverage. status is management, not tree health.
// Catalog/weekly updates are not survey dates. No living/removal field.
// Use tree points, not crown polygons. WFS 2.0 fails; 1.1 GeoJSON supports
// WGS84 despite the native EPSG:2056 CRS. Separate Latin fields avoid typos
// in baumnamelat; leave botanical spelling/canonicalization to the pipeline.
export function treeName(p: Feature['properties']): string | null {
  assert(p.baumgattunglat === null || typeof p.baumgattunglat === 'string');
  assert(p.baumartlat === null || typeof p.baumartlat === 'string');
  assert(['Obst', 'Grünanlage', 'Kanton', 'Strassenbaum', 'Wohnsiedlungen',
    'Strassenbaum (A)', 'Schulen'].includes(p.status), `Unexpected Zürich status: ${p.status}`);
  assert(['Parkbaum', 'Strassenbaum'].includes(p.kategorie));
  assert(['Obstbäume', 'nicht zugeordnet', 'Höhe:10-20m, Breite:<10m',
    'Höhe:>20m, Breite:>10m', 'Höhe:<10m, Breite:<10m',
    'Höhe:>20m, Breite:<10m'].includes(p.baumtyptext));
  let genus = p.baumgattunglat?.trim();
  if (!genus || ['Obstbaum', 'Laubbaum', 'Gehölz (Laub oder N'].includes(genus)) return null;
  assert(/^(?:x )?[A-Z][a-z]+$/.test(genus), `Unexpected Zürich genus: ${genus}`);
  let species = p.baumartlat?.trim().replace(/^(?:sp|spec|spp)\.$/, '');
  let name = [genus, species].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  if (/^(?:Buxus|Lonicera|Ligustrum|Photinia|Sycopsis)\b/.test(name)) return null;
  if (/^(?:Cornus sanguinea|Cephalotaxus harringtonii|Zanthoxylum piperitum|Salix (?:aurita|caesia|myrsinifolia|purpurea|rosmarinifolia))\b/.test(name)) return null;
  return name;
}

async function main() {
  let endpoint = 'https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Baumkataster';
  let params = {
    SERVICE: 'WFS', VERSION: '1.1.0', REQUEST: 'GetFeature',
    TYPENAME: 'baumkataster_baumstandorte'
  };
  async function getCount() {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: { ...params, RESULTTYPE: 'hits' }, responseType: 'text', timeout: 120000
    });
    let match = response.data.match(/\b(?:numberOfFeatures|numberMatched)="(\d+)"/);
    assert(match, 'Zürich WFS did not return a count');
    let total = Number(match[1]);
    assert(Number.isSafeInteger(total) && total > 0);
    return total;
  }
  let total = await getCount();
  let response = await CityUtil.getWithRetry(endpoint, {
    params: { ...params, OUTPUTFORMAT: 'application/vnd.geo+json', SRSNAME: 'EPSG:4326' },
    timeout: 240000
  });
  assert.equal(response.data.type, 'FeatureCollection');
  let rows: Feature[] = response.data.features;
  assert(Array.isArray(rows));
  assert.equal(rows.length, total, 'Incomplete Zürich export');
  assert.equal(await getCount(), total, 'Zürich inventory changed during download; retry');
  let ids = new Set<number>();
  let trees = [];
  let excluded: Record<string, number> = { botanical: 0, missing_geometry: 0 };
  for (let row of rows) {
    let id = row.properties.objectid;
    assert(Number.isSafeInteger(id) && !ids.has(id), 'Invalid/repeated Zürich tree ID');
    ids.add(id);
    if (row.geometry) {
      assert.equal(row.geometry.type, 'Point');
      assert.equal(row.geometry.coordinates.length, 2);
      let [lon, lat] = row.geometry.coordinates;
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 47.30 && lat < 47.45 && lon > 8.45 && lon < 8.65);
    }
    let name = treeName(row.properties);
    if (!name) { ++excluded.botanical; continue; }
    if (!row.geometry) { ++excluded.missing_geometry; continue; }
    let [lon, lat] = row.geometry.coordinates;
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'zurich_ch.json'), JSON.stringify(trees, null, 2));
  console.log(`zurich_ch: ${trees.length} trees; ${rows.length} source rows; exclusions ${JSON.stringify(excluded)}`);
}

if (require.main === module) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
