#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchArcGis(
    'https://services-ap1.arcgis.com/w6r4LlwgJu8O0neQ/arcgis/rest/services/Street_and_reserve_trees/FeatureServer/0',
    { where: "genus IS NOT NULL AND species IS NOT NULL", fields: 'genus,species', returnGeometry: true });
  let trees = [];

  for (let row of rows) {
    let a = row.attributes;
    let name = [a.genus?.trim(), a.species?.trim().toLowerCase()].filter(Boolean).join(' ');
    let lat = row.geometry?.y;
    let lon = row.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'wodonga_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
