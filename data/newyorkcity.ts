#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://data.cityofnewyork.us/resource/uvpi-gqnh.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
      select: 'latitude,longitude,spc_latin',
      order: 'tree_id',
      where: "status = 'Alive' AND spc_latin IS NOT NULL"
    }
  );

  let trees = rows.map(o => ({
    name: o.spc_latin,
    lat: o.latitude,
    lon: o.longitude
  }));

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
