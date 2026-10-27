#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City/West Coast Arborists public inventory: https://fontana-urbanforest.wca.app/
// Published in 2024; individual inspection dates are not exposed.
// Use original BotanicalName, not the species substituted for i-Tree benefit calculations.
async function main() {
  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/Fontana_iTree_Inv/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'T_Fontanainventory__XYTableT_11,T_Fontanainventory__XYTableT_15,T_Fontanainventory__XYTableT_16,T_Fontanainventory__XYTableT_30',
    where: 'T_Fontanainventory__XYTableT_11 IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 34 && o.geometry.y < 34.25 &&
      o.geometry.x > -117.6 && o.geometry.x < -117.3)
    .filter(o => o.attributes.T_Fontanainventory__XYTableT_15?.trim() === 'Yes' &&
      o.attributes.T_Fontanainventory__XYTableT_30?.trim() !== 'Dead' &&
      !/^(Plant|Removal-Stump|Removal-Dead (Small )?Tree)$/.test(
        o.attributes.T_Fontanainventory__XYTableT_16?.trim() ?? ''))
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.T_Fontanainventory__XYTableT_11.replace(/\s+/g, ' ').trim()
    }))
    .filter(o => o.name && !/^(Deciduous|Unknown|Vacant|Stump)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'fontana_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`fontana_ca_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
