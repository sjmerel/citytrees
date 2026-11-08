#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: {
    OBJECT: string;
    LATIJNSE_NAAM: string | null;
    LAT: string | null;
    LON: string | null;
  };
}

interface FeatureCollection {
  type: string;
  numberMatched: number;
  features: Feature[];
}

// Gemeente Groningen, Bomen gemeente Groningen; CC BY 4.0.
// https://data.groningen.nl/dataset/bomen/04da3775-07f0-4388-bc12-7cd7536b04cd
// Monthly municipal-managed inventory, including Haren, Glimmen and Ten Boer.
// Publisher says updated through 2026-11-02; KIEMJAAR is germination, not survey.
// OBJECT is a stable STRING, whereas fetchWfs requires numeric IDs; use the
// retry helper for a bulk WFS export with hits/count and string-ID checks.
// Use the publisher's LAT/LON attributes: WFS CRS84 reprojection differs from
// them by about 75 m (the native geometry matches X_COORDINAAT/Y_COORDINAAT).
// Do not repair truncated/misspelled genera by inventing a botanical crosswalk.
async function main() {
  let endpoint = 'https://maps.groningen.nl/geoserver/geo-data/ows';
  let params = {
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'geo-data:Bomen gemeente Groningen'
  };
  async function getCount(): Promise<number> {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: { ...params, resultType: 'hits' }, responseType: 'text', timeout: 120000
    });
    let text: string = response.data;
    let match = text.match(/\bnumberMatched="(\d+)"/);
    assert(match, 'WFS did not return a total');
    let count = Number(match[1]);
    assert(Number.isSafeInteger(count) && count > 0);
    return count;
  }
  let total = await getCount();
  let response = await CityUtil.getWithRetry(endpoint, {
    params: {
      ...params, outputFormat: 'application/json', srsName: 'EPSG:28992',
      sortBy: 'OBJECT', count: total
    },
    timeout: 240000
  });
  let data: FeatureCollection = response.data;
  assert.equal(data.type, 'FeatureCollection');
  assert(Array.isArray(data.features));
  assert.equal(data.numberMatched, total, 'Groningen inventory changed; retry');
  assert.equal(data.features.length, total, 'Incomplete Groningen WFS export');
  assert.equal(await getCount(), total, 'Groningen inventory changed during download; retry');
  let ids = new Set<string>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of data.features) {
    let p = row.properties;
    assert(typeof p.OBJECT === 'string' && /^\d+$/.test(p.OBJECT) && !ids.has(p.OBJECT),
      'Invalid/repeated Groningen tree ID');
    ids.add(p.OBJECT);
    assert(p.LATIJNSE_NAAM === null || typeof p.LATIJNSE_NAAM === 'string');
    assert(p.LAT === null || typeof p.LAT === 'string');
    assert(p.LON === null || typeof p.LON === 'string');
    let name = p.LATIJNSE_NAAM?.replace(/[‘’´]/g, "'").replace(/\s+/g, ' ').trim();
    if (!name || /^(?:Verwijderd|Vruchtboom|WW)(?:\s|$)/.test(name)) continue;
    if (/^(?:elkova|anthoxylum|iziphus|Julans)(?:\s|$)/.test(name)) continue;
    if (name === 'PYRUS') name = 'Pyrus';
    assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Groningen botanical name: ${name}`);
    if (/^(?:Enkianthus|Euonymus|Frangula|Microbiota|Pseudotaxus|Sambucus)\b/.test(name)) continue;
    if (/^(?:Aesculus parviflora|Cephalotaxus nana|Corylus maxima|Elaeagnus multiflora|Juniperus (?:horizontalis|media|sabina)|Pinus (?:mugo|pumila)|Prunus (?:laurocerasus|spinosa))\b/.test(name)) continue;
    if (/^(?:Chamaecyparis obtusa 'Nana Gracilis'|Picea glauca 'Alberta Globe'|Thuja occidentalis '(?:Aurea Nana|Little Champion)')$/.test(name)) continue;
    if (!row.geometry || !p.LAT || !p.LON) continue;
    assert.equal(row.geometry.type, 'Point');
    let lat = Number(p.LAT);
    let lon = Number(p.LON);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 53.10 && lat < 53.33 && lon > 6.45 && lon < 6.78);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'groningen_nl.json'), JSON.stringify(trees, null, 2));
  console.log(`groningen_nl: ${trees.length} trees; ${total - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
