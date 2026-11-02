#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/qN3V93cYGMKQCOxL/arcgis/rest/services/Somerville_Tree_Inventory_as_of_03_05_23/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'ObjectId,Species',
    where: "Species IS NOT NULL",
    returnGeometry: true,
    verifyComplete: true
  });

  // Species looks like "linden: littleleaf (Tilia cordata)"
  let trees = rows.filter(o => !/stump|vacant|unknown/i.test(o.attributes.Species)).map(o => ({
    name: o.attributes.Species.match(/\(([^()]*)\)\s*$/)![1].trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'somerville_ma_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
