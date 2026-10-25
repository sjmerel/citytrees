#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchArcGis(
    'https://services1.arcgis.com/cNVyNtjGVZybOQWZ/arcgis/rest/services/Trees/FeatureServer/0',
    { where: "SpeciesName IS NOT NULL", fields: 'SpeciesName', returnGeometry: true });
  let trees = [];

  for (let row of rows) {
    let a = row.attributes;
    let name = (a.SpeciesName ?? '').trim().replace(/ sp\.?$/i, '');
    let lat = row.geometry?.y;
    let lon = row.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'sydney_nsw_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
