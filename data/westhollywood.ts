#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://data.weho.org/resource/qqwt-wx9z.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
    where: 'location_1.latitude != 0 AND location_1.longitude != 0',
    order: ':id'
  });

  let trees = rows.map(o => ({
    lat: o.location_1.latitude,
    lon: o.location_1.longitude,
    name: o.botanicalname.trim()
  }));

  fs.writeFileSync('westhollywood.json', JSON.stringify(trees, null, 2));
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
