#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://data.cityofnewyork.us/resource/uvpi-gqnh.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
      '$select': 'latitude,longitude,spc_latin',
      '$order': 'tree_id',
      '$where': "status = 'Alive' AND latitude IS NOT NULL AND longitude IS NOT NULL AND spc_latin IS NOT NULL"
    }
  );

  //let skipped = 0;
  const trees = [];
  for (const row of rows) {
    const name = String(row.spc_latin ?? '').trim();
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    /*
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat === 0 || lon === 0) {
      ++skipped;
      continue;
    }
    */
    trees.push({ lat, lon, name });
  }

  //console.log(`processed ${rows.length}, skipped ${skipped}`);
  fs.writeFileSync('newyorkcity.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();
