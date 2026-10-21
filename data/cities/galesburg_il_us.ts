#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/T5ar9pn3YeFZ47Wh/arcgis/rest/services/Galesburg_Tree_Inventory_Public/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GENUS',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  const trees = rows.filter((row: any) => row.geometry && row.attributes.GENUS?.trim()).map((row: any) => ({
    name: row.attributes.GENUS.trim(),
    lat: row.geometry.y,
    lon: row.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'galesburg_il_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to galesburg_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
