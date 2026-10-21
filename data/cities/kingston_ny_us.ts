#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/nVaPPG0tdkBXOK5F/arcgis/rest/services/Tree_Inventory_Kingston_NY_view/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.BOTANICAL?.trim())
    .map((row: any) => ({
      name: row.attributes.BOTANICAL.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'kingston_ny_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to kingston_ny_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
