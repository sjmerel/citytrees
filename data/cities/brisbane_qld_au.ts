#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface Tree {
  objectid: number;
  scientific_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Brisbane City Council, Sherwood Arboretum only, CC BY 4.0.
// https://data.brisbane.qld.gov.au/explore/dataset/botanic-collection-sherwood-arboretum/
// April 2025 metadata revision is not a survey date; no health/removal field.
// The collection includes shrubs. Omit clearly shrubby species and ambiguous
// slash-separated identifications. objectid is unique; tree_id is not.
const shrubs = new Set(['Banksia robur', 'Breynia oblongifolia', 'Pittosporum multiflorum']);

async function main() {
  let endpoint = 'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/botanic-collection-sherwood-arboretum';
  let count = (await axios.get(`${endpoint}/records`, {
    params: { limit: 0 }, timeout: 60000
  })).data.total_count;
  assert(Number.isInteger(count) && count > 0);
  let rows: Tree[] = (await axios.get(`${endpoint}/exports/json`, { timeout: 60000 })).data;
  assert(Array.isArray(rows) && rows.length === count, 'Incomplete Sherwood Arboretum export');
  let ids = new Set<number>();
  let trees = [];
  for (let row of rows) {
    assert(Number.isInteger(row.objectid) && !ids.has(row.objectid), 'Repeated Sherwood objectid');
    ids.add(row.objectid);
    assert(row.scientific_name === null || typeof row.scientific_name === 'string');
    let name = row.scientific_name?.replace(/\s+/g, ' ').trim();
    if (!name || name.includes('/') || shrubs.has(name)) continue;
    if (row.latitude === null || row.longitude === null) continue;
    let lat = row.latitude!, lon = row.longitude!;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > -27.54 && lat < -27.52 && lon > 152.96 && lon < 152.99);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'brisbane_qld_au.json'), JSON.stringify(trees, null, 2));
  console.log(`brisbane_qld_au: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
