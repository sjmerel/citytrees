#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/Maywood_iTree_Inventory_WFL1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,BotanicalName',
    where: "BotanicalName IS NOT NULL AND BotanicalName <> ''",
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BotanicalName.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'maywood_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
