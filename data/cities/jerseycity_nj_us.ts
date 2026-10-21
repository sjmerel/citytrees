#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  // Jersey City's public 2020 tree inventory. Keep active records with a
  // botanical name; the other records are not usable tree-species points.
  let endpoint = 'https://services2.arcgis.com/UXbywc7dSkfgdPp4/arcgis/rest/services/JC_TreeInventory_20210902/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "ACTIVE = 1 AND SPP_BOT IS NOT NULL AND SPP_BOT <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.attributes.SPP_BOT)
    .map(o => ({
      name: o.attributes.SPP_BOT.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'jerseycity_nj_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
