#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Marina_del_Rey_Trees_Managed_by_LA_County_Beaches_and_Harbors_/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,SPP',
    where: "ACTIVE = 'Yes' AND SPP IS NOT NULL",
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'marinadelrey_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
