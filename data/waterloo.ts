#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/ZpeBVw5o1kjit7LT/arcgis/rest/services/Street_Tree_Inventory/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: 'LATIN_NAME IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.LATIN_NAME.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('waterloo.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
