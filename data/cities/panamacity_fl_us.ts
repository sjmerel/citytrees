#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services3.arcgis.com/RfAh242jlP6Nb5vP/arcgis/rest/services/TreeInventory_CPC/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "LatinName IS NOT NULL AND LatinName <> ' ' AND LatinName <> 'N/A'",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.LatinName?.trim())
    .map((row: any) => ({
      name: row.attributes.LatinName.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'panamacity_fl_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to panamacity_fl_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
