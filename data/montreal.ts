#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://donnees.montreal.ca/dataset/b89fd27d-4b49-461b-8e54-fa2b34a628c4/resource/64e28fe6-ef37-437a-972d-d1d3f1f7d891/download/arbres-publics.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let lat = parseFloat(row.Latitude);
    let lon = parseFloat(row.Longitude);
    if (!row.Essence_latin || !Number.isFinite(lat) || !Number.isFinite(lon)) || lat < 10 || lon > -20) {
      continue;
    }
    trees.push({ name: row.Essence_latin.trim(), lat, lon });
  }

  fs.writeFileSync('montreal.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
