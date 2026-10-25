#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.cityofrochester.gov/server/rest/services/Open_Data/Trees_Open_Data/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND GENUS <> '' AND GENUS <> '0' AND GENUS NOT LIKE 'PLANTING SITE%' AND GENUS <> 'STUMP'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: (o.attributes.GENUS.trim() + ' ' + (o.attributes.SPECIES ?? '').replace(/^(0|SPECIES)$/, '').trim()).trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'rochester_ny_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
