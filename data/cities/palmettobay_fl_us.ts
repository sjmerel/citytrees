#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/wUUM9nP0Ii27QynB/arcgis/rest/services/Historical_Tree_Inventory_(View)/FeatureServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Scientific',
    where: "Scientific IS NOT NULL AND Scientific <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.Scientific.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'palmettobay_fl_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
