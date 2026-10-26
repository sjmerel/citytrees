#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official city inventory, with retained records inspected in 2025-2026.
// Status can be Alive while Tree_Condition is Dead, so check both fields.
async function main() {
  let endpoint = 'https://cityworks.cityofloveland.org/arcgis/rest/services/ParksandRec/Trees/MapServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "Status = 'Alive' AND (Tree_Condition IS NULL OR Tree_Condition <> 'Dead') AND LatinName IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 40.3 && o.geometry.y < 40.6 &&
      o.geometry.x > -105.4 && o.geometry.x < -104.9)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.LatinName.trim()
    }))
    .filter(o => o.name && o.name !== 'Arborvitae');

  fs.writeFileSync(path.join(__dirname, 'loveland_co_us.json'), JSON.stringify(trees, null, 2));
  console.log(`loveland_co_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
