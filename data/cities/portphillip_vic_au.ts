#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://data.gov.au/data/dataset/6b72d22b-d824-4281-bd08-ab62e3c38415/resource/dd8aa3f7-d5c2-459b-af5c-9b31a6848455/download/city-of-port-phillip-trees.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let lat = Number(row.lat);
    let lon = Number(row.lon);
    // "Eucalyptus sp." is genus-only
    let name = (row.species ?? '').trim().replace(/\s+/g, ' ').replace(/ sp\.?$/i, '');
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'portphillip_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
