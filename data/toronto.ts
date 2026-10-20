#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/6ac4569e-fd37-4cbc-ac63-db3624c5f6a2/resource/b65cd31d-fabc-4222-83ef-8ddd11295d2b/download/street-tree-data-4326.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let coordinates = JSON.parse(row.geometry).coordinates[0];
    let lat = coordinates[1];
    let lon = coordinates[0];
    if (!row.BOTANICAL_NAME || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name: row.BOTANICAL_NAME.trim(), lat, lon });
  }

  fs.writeFileSync('toronto.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
