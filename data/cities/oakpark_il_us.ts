#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/aymthbPDQOcCnuwg/arcgis/rest/services/VOP_Trees_6_2_21_Viewing/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_LATIN,REMOVED_DATE',
    where: "SPP_LATIN IS NOT NULL AND SPP_LATIN <> '' AND REMOVED_DATE IS NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_LATIN.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'oakpark_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
