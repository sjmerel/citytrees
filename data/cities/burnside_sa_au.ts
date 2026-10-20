#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  let endpoint = 'https://data.sa.gov.au/data/dataset/b7e1c8f6-169c-41bd-b5d7-140395a41c38/resource/6d1912aa-4775-4f5e-b00d-18456ad872a5/download/burnsidetrees2019.geojson';
  let response = await axios.get(endpoint, { maxContentLength: Infinity, headers: { 'User-Agent': 'Mozilla/5.0' } });
  let trees = [];

  for (let feature of response.data.features) {
    let [lon, lat] = feature.geometry?.coordinates ?? [];
    let name = (feature.properties.BotanicalN ?? '').trim().replace(/\s+/g, ' ').replace(/ (species|spp?\.?)$/i, '');
    if (!name || /^(unknown|not recorded|vacant.*)$/i.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'burnside_sa_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
