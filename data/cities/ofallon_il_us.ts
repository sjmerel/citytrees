#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services.arcgis.com/K8hCj4l2z1EMabnx/arcgis/rest/services/CityTrees/FeatureServer/16';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'TREESPECIES',
    where: "TREESPECIES IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.TREESPECIES?.trim())
    .map((row: any) => ({
      name: row.attributes.TREESPECIES.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'ofallon_il_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to ofallon_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
