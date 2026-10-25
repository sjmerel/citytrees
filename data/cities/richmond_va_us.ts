#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/k3vhq11XkBNeeOfM/arcgis/rest/services/Tree_Inventory_Public_View/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "Status = 'In Service' AND SPP IS NOT NULL AND SPP NOT LIKE '%Vacant%' AND SPP NOT IN ('Stump', 'Unknown tree', 'Unknown shrub')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'richmond_va_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
