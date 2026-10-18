#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://gis.bouldercolorado.gov/ags_svr2/rest/services/parks/TreesOpenData/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATINNAME',
    where: "LATINNAME IS NOT NULL AND LATINNAME <> ''",
    returnGeometry: true
  });

  // some rows have bogus coordinates far outside Boulder
  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 39.9 && o.geometry.y < 40.2 && o.geometry.x > -105.4 && o.geometry.x < -105.0)
    .map(o => ({
      name: o.attributes.LATINNAME.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync('boulder.json', JSON.stringify(trees, null, 2));
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
