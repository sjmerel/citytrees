#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';

// Colac Otway Shire, CC BY 3.0 Australia; January 2015 published export.
// https://data.gov.au/data/dataset/colac-otway-shire-trees
// Mostly streets in Colac, with smaller Cressy/Apollo Bay coverage.
// No health/removal field; Year_Planted is not an inspection date.
// Tree_ID repeats at distinct surveyed positions; retain those observations.
const nonTrees = new Set([
  'Calothamnus quadrifidus', 'Choisya ternata', 'Coleonema pulchellum',
  'Genista anglica', 'Polygala grandiflora'
]);

async function main() {
  let response = await axios.get(
    'https://data.gov.au/data/dataset/3ce1805b-cb81-4683-8f46-e7bd2d2a3b7c/resource/bcf1d62b-9e72-4eca-b183-418f83dedcea/download/costreesopendata.csv',
    { responseType: 'text', timeout: 60000 });
  let rows: Record<string, string>[] = parse(response.data, { columns: true, bom: true, skip_empty_lines: true });
  let trees = [];
  for (let row of rows) {
    assert(typeof row.Tree_ID === 'string' && row.Tree_ID.trim());
    assert(typeof row.Genus_Desc === 'string' && typeof row.Spec_Desc === 'string');
    assert(typeof row.GPS_lat === 'string' && typeof row.GPS_lon === 'string');
    let genus = row.Genus_Desc.trim();
    if (!genus || /^(?:unknown|unidentified)$/i.test(genus)) continue;
    let name = `${genus} ${row.Spec_Desc}`.replace(/\s+/g, ' ').trim();
    if (nonTrees.has(name) || /^(?:dead|stump|removed)$/i.test(row.Life_stage_desc.trim())) continue;
    if (!row.GPS_lat.trim() || !row.GPS_lon.trim()) continue;
    let lat = Number(row.GPS_lat), lon = Number(row.GPS_lon);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > -38.9 && lat < -37.9 && lon > 143.3 && lon < 144);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'colacotway_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(`colacotway_vic_au: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
