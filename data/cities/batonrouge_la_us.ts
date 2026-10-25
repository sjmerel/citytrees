#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/KYvXadMcgf0K1EzK/arcgis/rest/services/Tree_Inventory_Map1/FeatureServer/7';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "Status = 'Alive' AND LatinName IS NOT NULL AND LatinName <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.LatinName.replace(/\s*\((SMALL|MEDIUM|LARGE)\)\s*$/i, '').trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'batonrouge_la_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
