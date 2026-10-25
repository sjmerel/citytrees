#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://services8.arcgis.com/00P6VbLtS94ANPBW/arcgis/rest/services/Tree_Inventory_view/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.BOTANICALN?.trim())
    .map((row: any) => ({
      name: row.attributes.BOTANICALN.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'sangabriel_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to sangabriel_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
