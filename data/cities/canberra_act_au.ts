#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let rows = await DataUtil.fetchArcGis(
    'https://services1.arcgis.com/E5n4f1VY84i0xSjy/arcgis/rest/services/ACTGOV_Tree_Assets/FeatureServer/0',
    { where: "OPERATIONAL_STATE = 'ACTIVE' AND BOTANICAL_NAME IS NOT NULL", fields: 'BOTANICAL_NAME', returnGeometry: true });
  let trees = [];

  for (let row of rows) {
    // "Eucalyptus sp." is genus-only
    let name = (row.attributes.BOTANICAL_NAME ?? '').trim().replace(/ spp?\.?$/i, '');
    let lat = row.geometry?.y;
    let lon = row.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'canberra_act_au.json'), JSON.stringify(trees));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
