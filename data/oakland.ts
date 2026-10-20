#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/9tC74aDHuml0x5Yz/arcgis/rest/services/Oakland_Public_Tree_Inventory_/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species___botanical',
    where: "Species___botanical IS NOT NULL AND Public_Tree = 'Yes'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Species___botanical.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('oakland.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
