#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://gis.santamonica.gov/server/rest/services/Trees/MapServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'botanicalname,latitude,longitude',
      where: "botanicalname IS NOT NULL AND botanicalname <> ''",
    }
  );

  let trees = rows.map(o => ({
    name: o.attributes.botanicalname,
    lat: o.attributes.latitude,
    lon: o.attributes.longitude,
  }));

  fs.writeFileSync('santamonica.json', JSON.stringify(trees, null, 2));
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
