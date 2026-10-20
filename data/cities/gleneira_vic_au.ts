#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  let endpoint = 'https://data.gov.au/data/dataset/ed15e3ea-48dc-47d2-afa6-518e6f5276e1/resource/85c2d44c-8ccf-4a32-9881-872f1a511ef7/download/streetandparktrees.json';
  let response = await axios.get(endpoint, { maxContentLength: Infinity });
  let trees = [];

  for (let feature of response.data.features) {
    let [lon, lat] = feature.geometry?.coordinates ?? [];
    let name = (feature.properties.Botanical ?? '').trim().replace(/\s+/g, ' ').replace(/ (species|spp?\.?)$/i, '');
    if (!name || /^(unknown|not recorded|vacant.*)$/i.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'gleneira_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
