#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';

// Manningham City Council street trees, CC BY 3.0 Australia.
// https://data.gov.au/data/dataset/manningham-streettrees
// November 2019 export; date1 values span 2008-2018, not the catalog revision.
// No individual IDs or health/removal field. Retain source botanical spelling
// for the shared normalization/canonicalization pipeline.
const nonTreeGenera = new Set([
  'agave', 'choisya', 'coleonema', 'crassula', 'lantana', 'lavatera',
  'nandina', 'pelargonium', 'phyllostachys', 'plumbago', 'prostanthera',
  'rosa', 'strelitzia', 'tecomaria', 'westringia'
]);

async function main() {
  let response = await axios.get(
    'https://data.gov.au/data/dataset/1aef5123-24ff-4084-a0f1-a52ca71e9e99/resource/4797e8de-9750-4ed7-9d84-ea318302b881/download/manningham_street_trees.csv',
    { responseType: 'text', timeout: 60000 });
  let rows: Record<string, string>[] = parse(response.data, { columns: true, bom: true, skip_empty_lines: true });
  let trees = [];
  for (let row of rows) {
    assert(typeof row.species === 'string' && typeof row.lat === 'string' && typeof row.lon === 'string');
    let name = row.species.replace(/\s+/g, ' ').trim();
    if (!name || /^(?:vacant\b|stump\b|dead\b|removed\b|unidentified\b|unknown\b)/i.test(name)) continue;
    if (/^(?:Helliptica|oleander|Carob ceratonia|Coprosmia aurens)$/i.test(name)) continue;
    if (nonTreeGenera.has(name.split(' ')[0].toLowerCase())) continue;
    if (!row.lat.trim() || !row.lon.trim()) continue;
    let lat = Number(row.lat), lon = Number(row.lon);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > -37.85 && lat < -37.65 && lon > 145.05 && lon < 145.35);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'manningham_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(`manningham_vic_au: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
