#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Entries that are not actual trees
const skip = /vacant|unknown|^none$|stump|^other$|no tree|not specified|n\/a/i;

async function main() {
  let endpoint = 'https://services8.arcgis.com/OPmRdssd8jj0bT5H/arcgis/rest/services/Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species,Genus',
    where: "Species IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 20 && o.geometry.x < -100)
    .map(o => ({
      name: String(o.attributes.Species).trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }))
    .filter(t => t.name.length > 2 && !skip.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'milpitas_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`milpitas_ca_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
