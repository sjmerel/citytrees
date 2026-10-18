#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://data.cityofnewyork.us/resource/hn5i-inap.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
      select: 'genusspecies,location',
      order: 'objectid',
      where: "tpstructure = 'Full' AND genusspecies IS NOT NULL AND location IS NOT NULL"
    }
  );

  let trees = rows.map(o => ({
    name: o.genusspecies.split(' - ')[0].trim(),
    lat: o.location.coordinates[1],
    lon: o.location.coordinates[0]
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
