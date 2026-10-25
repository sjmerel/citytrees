#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Houston Parks Board tree inventory (park trees only, not a full city-wide inventory).
async function main() {
  const endpoint = 'https://services6.arcgis.com/Xv3JMHA0Kl8GN3tJ/arcgis/rest/services/HPB_Tree_Inventory_new/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "SPP_BOT IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.SPP_BOT?.trim())
    .map((row: any) => ({
      name: row.attributes.SPP_BOT.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'houstonparks_tx_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to houstonparks_tx_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
