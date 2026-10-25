#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://geo.sanjoseca.gov/server/rest/services/OPN/OPN_OpenDataService/MapServer/510';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'NAMESCIENTIFIC',
    where: "NAMESCIENTIFIC IS NOT NULL AND NAMESCIENTIFIC <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.NAMESCIENTIFIC.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'sanjose_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
