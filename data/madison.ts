#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://maps.cityofmadison.com/arcgis/rest/services/Public/OPEN_DATA/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "STATUS = 'Active' AND SPP_BOT IS NOT NULL AND SPP_BOT NOT IN ('Vacant', 'Plat Assessable', 'NR')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_BOT.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('madison.json', JSON.stringify(trees, null, 2));
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
