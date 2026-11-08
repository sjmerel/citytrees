#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://gis.beverlyhills.org/arcgis/rest/services/OD/OpenData_BeverlyHillsGeoHub/FeatureServer/1';

  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,BOTANICAL',
    where: "BOTANICAL IS NOT NULL AND BOTANICAL <> ''",
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.BOTANICAL))
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BOTANICAL.trim()
    }));

  fs.writeFileSync(path.join(__dirname, 'beverlyhills_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
