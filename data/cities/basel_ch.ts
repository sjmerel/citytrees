#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  gml_id: string;
  ba_baumnr: string;
  baumart_lateinisch: string | null;
  ba_gemeinde: string;
  ba_gruppe: string;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Geodaten Kanton Basel-Stadt, Baumkataster: Baumbestand:
// https://data.bs.ch/explore/dataset/100052/
// CC BY 4.0; attribute Geodaten Kanton Basel-Stadt and indicate processing.
// Portal "+ OpenStreetMap" links permission to incorporate CC BY data in OSM,
// not evidence of OSM-derived data or an ODbL obligation:
// https://data-bs.ch/stata/dataspot/permalinks/20240822-osm-vektordaten.pdf
// Basel and Riehen managed trees, including municipal-maintained private trees.
// Protection status is not health/removal status; no such field is supplied.
// Daily processing/metadata dates are not survey dates.
export function treeName(value: string | null): string | null {
  assert(value === null || typeof value === 'string');
  let name = value?.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  name = name.replace(/^x(?=[A-Z])/, 'x ').replace(/\s+(?:sp|spec|spp)\.$/, '');
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Basel botanical name: ${name}`);
  if (/^Buxus\b/.test(name)) return null;
  return name;
}

async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.bs.ch/api/explore/v2.1/catalog/datasets/100052');
  let ids = new Set<string>();
  let numbers = new Set<string>();
  let trees = [];
  let excluded: Record<string, number> = { botanical: 0, missing_geometry: 0 };
  for (let row of rows) {
    assert(typeof row.gml_id === 'string' && row.gml_id.length > 0 && !ids.has(row.gml_id),
      'Invalid/repeated Basel tree ID');
    assert(typeof row.ba_baumnr === 'string' && row.ba_baumnr.length > 0 && !numbers.has(row.ba_baumnr),
      'Invalid/repeated Basel tree number');
    ids.add(row.gml_id);
    numbers.add(row.ba_baumnr);
    assert(['Basel', 'Riehen'].includes(row.ba_gemeinde));
    assert(['Spiel- und Rastplätze', 'Landschaftsgrün', 'Naturschutzanlage',
      'Verkehrsgrün / Strassenbäume', 'Parkgrün', 'Strassenbäume', 'Öffentliche Grünflächen',
      'Schul- und Kindergartenareal', 'Privatbäume gepflegt durch STG', 'Schulen',
      'Kindergärten', 'Liegenschaftsverwaltung', 'Freizeit- und Sportanlagen',
      'Privatbäume Pflege Gärtnerei'].includes(row.ba_gruppe), `Unexpected Basel group: ${row.ba_gruppe}`);
    if (row.geo_point_2d) {
      let { lat, lon } = row.geo_point_2d;
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 47.50 && lat < 47.62 && lon > 7.52 && lon < 7.70);
    }
    let name = treeName(row.baumart_lateinisch);
    if (!name) { ++excluded.botanical; continue; }
    if (!row.geo_point_2d) { ++excluded.missing_geometry; continue; }
    let { lat, lon } = row.geo_point_2d;
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'basel_ch.json'), JSON.stringify(trees, null, 2));
  console.log(`basel_ch: ${trees.length} trees; ${rows.length} source rows; exclusions ${JSON.stringify(excluded)}`);
}

if (require.main === module) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
