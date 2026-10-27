#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official inventory: use the individual-tree layer, not shrub areas or street aggregates.
// Inspected dates span 2016-2026; records without botanical names are excluded.
async function main() {
  let endpoint = 'https://services1.arcgis.com/YdUP5V6WwzeG8T8r/arcgis/rest/services/PSL_Trees/FeatureServer/2';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName',
    where: "TreeShrub = 'Tree' AND BotanicalName IS NOT NULL AND (Condition IS NULL OR Condition <> 'Dead')",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 27.1 && o.geometry.y < 27.4 &&
      o.geometry.x > -80.6 && o.geometry.x < -80.2)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BotanicalName.replace(/\s+/g, ' ').trim()
    }))
    .filter(o => o.name && !/^(#N\/A|0|Wax Myrtle)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'portstlucie_fl_us.json'), JSON.stringify(trees, null, 2));
  console.log(`portstlucie_fl_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
