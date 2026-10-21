#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/3CyDafKD7aN8Dr8M/arcgis/rest/services/Tree_Inventory_2021/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL AND UPPER(BOTANICALN) NOT LIKE '%VACANT%' AND UPPER(BOTANICALN) NOT LIKE '%STUMP%'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BOTANICALN.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'placentia_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
