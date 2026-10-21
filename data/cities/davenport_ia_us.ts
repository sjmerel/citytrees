#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services.arcgis.com/Sf3rzzad9Dl4Cuf7/arcgis/rest/services/Trees_All/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "SPP_BOT IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.SPP_BOT?.trim())
    .map((row: any) => ({
      name: row.attributes.SPP_BOT.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'davenport_ia_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to davenport_ia_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
