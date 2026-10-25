#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/Master_Anaheim_Tree_Inventory/FeatureServer/0';

  let rows = await CityUtil.fetchArcGis(endpoint, {
      fields: 'BotanicalName',
      where: "BotanicalName IS NOT NULL AND BotanicalName <> '' AND BotanicalName NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 33.7 && o.geometry.y < 34 && o.geometry.x > -118.1 && o.geometry.x < -117.6)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BotanicalName.trim()
    }));

  // drop non-trees and multi-species composite records such as "A; B"
  trees = trees.filter(o => !/^(stump|dead tree|unknown|none|not city planted)\b/i.test(o.name) && !o.name.includes(';'));

  fs.writeFileSync(path.join(__dirname, 'anaheim_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
