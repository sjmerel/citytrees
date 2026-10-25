#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/4nU7cbKqLfftauX2/arcgis/rest/services/TreeInventory/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL AND BOTANICAL <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.BOTANICAL))
    .map(o => ({
      name: o.attributes.BOTANICAL.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'auburn_me_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
