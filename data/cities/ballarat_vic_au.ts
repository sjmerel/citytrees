#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://data.ballarat.vic.gov.au/api/v2/catalog/datasets/trees/exports/csv?delimiter=%2C';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let name = (row.species ?? '').trim().replace(/\s+/g, ' ');
    let [lat, lon] = (row.point ?? '').split(',').map(Number);
    if (!name || /^(not (assessed|recorded)|native sp\.?)$/i.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    // "Eucalyptus Sp." is genus-only
    name = name.replace(/ sp\.?$/i, '');
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'ballarat_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
