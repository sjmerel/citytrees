#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://mgis.beverlyhills.org/arcgis/rest/services/Hansen/CBH_IPS_GIS_UrbanForest_Feature/MapServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, { 
    outFields: 'BotanicalName,Latitude,Longitude',
    where: 'Latitude <> 0 AND Longitude <> 0'
  });

  let trees = rows.map(o => ({
    lat: o.attributes.Latitude,
    lon: o.attributes.Longitude,
    name: o.attributes.BotanicalName.trim()
  }));

  fs.writeFileSync('beverlyhills.json', JSON.stringify(trees, null, 2));
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
