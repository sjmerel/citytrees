#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  let endpoint = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/trees-with-species-and-dimensions-urban-forest/exports/json';
  let response = await axios.get(endpoint, { params: { select: 'scientific_name,latitude,longitude' }, maxContentLength: Infinity });
  let trees = [];

  for (let row of response.data) {
    let lat = Number(row.latitude);
    let lon = Number(row.longitude);
    let name = (row.scientific_name ?? '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'melbourne_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
