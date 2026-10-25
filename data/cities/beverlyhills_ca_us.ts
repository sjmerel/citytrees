#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://mgis.beverlyhills.org/arcgis/rest/services/Hansen/CBH_IPS_GIS_UrbanForest_Feature/MapServer/0';

  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName,Latitude,Longitude',
    where: 'Latitude <> 0 AND Longitude <> 0'
  });

  let trees = rows.map(o => ({
    lat: o.attributes.Latitude,
    lon: o.attributes.Longitude,
    name: o.attributes.BotanicalName.trim()
  }));

  fs.writeFileSync(path.join(__dirname, 'beverlyhills_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
