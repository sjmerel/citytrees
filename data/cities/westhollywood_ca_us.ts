#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://data.weho.org/resource/qqwt-wx9z.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
    where: 'location_1.latitude != 0 AND location_1.longitude != 0',
    order: ':id'
  });

  let trees = rows.map(o => ({
    lat: parseFloat(o.location_1.latitude),
    lon: parseFloat(o.location_1.longitude),
    name: o.botanicalname.trim()
  }));

  fs.writeFileSync(path.join(__dirname, 'westhollywood_ca_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
