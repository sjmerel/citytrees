#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City-linked WCA inventory: https://www.cityofbell.gov/City-Hall/Public-Works/Master-Plans-and-Policy-Documents/Urban-Forestry-Benefits
// February 2026 export; individual inspection dates are not exposed.
// BotanicalName is the original identification, not the i-Tree Species_Name substitute.
async function main() {
  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/City_of_Bell_Tree_Inventory_Benefits_WFL1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName,IsValid,TreeCondition,Recommended',
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 33.95 && o.geometry.y < 34.02 &&
      o.geometry.x > -118.22 && o.geometry.x < -118.14)
    .filter(o => o.attributes.IsValid?.trim() === 'Yes' &&
      o.attributes.TreeCondition?.trim() !== 'Dead' &&
      !/^(Plant|Removal-Stump|Removal-Dead (Small )?Tree)$/.test(
        o.attributes.Recommended?.trim() ?? ''))
    .map(o => ({
      lat: o.geometry.y, lon: o.geometry.x,
      name: o.attributes.BotanicalName?.replace(/\s+/g, ' ').trim()
    }))
    .filter(o => o.name && !/^(Unknown|Vacant(?: site)?|Stump)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'bell_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`bell_ca_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
