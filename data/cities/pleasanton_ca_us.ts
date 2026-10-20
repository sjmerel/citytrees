#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Entries that are not actual trees
const skip = /vacant|unknown|^none$|stump|^other$|no tree|not specified|n\/a/i;

async function main() {
  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/TreeInvPleasanton_Public/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
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

  fs.writeFileSync(path.join(__dirname, 'pleasanton_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`pleasanton_ca_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
