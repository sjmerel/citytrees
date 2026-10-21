#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/R1JbITZvSQHJsl5r/arcgis/rest/services/City_Managed_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_bot',
    where: "SPP_bot IS NOT NULL AND SPP_bot <> '' AND SPP_bot NOT LIKE 'STUMP%'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_bot.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'ithaca_ny_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
