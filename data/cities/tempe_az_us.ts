#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Entries that are not actual trees
const skip = /vacant|unknown|^none$|stump|^other$|no tree|not specified|n\/a/i;

async function main() {
  let endpoint = 'https://services.arcgis.com/lQySeXwbBg53XWDi/arcgis/rest/services/Tempe_iTreeResults_TempeAZJuly2024_WebMap_WFL1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName',
    where: "BotanicalName IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 20 && o.geometry.x < -100)
    .map(o => ({
      name: String(o.attributes.BotanicalName).trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }))
    .filter(t => t.name.length > 2 && !skip.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'tempe_az_us.json'), JSON.stringify(trees, null, 2));
  console.log(`tempe_az_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
