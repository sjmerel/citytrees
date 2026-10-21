#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/HQc1pFcZLNmWhjxW/arcgis/rest/services/Street_Trees_Amherst_Town/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species',
    where: "Species IS NOT NULL AND Species <> '' AND Species <> '_'",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/^unknown/i.test(o.attributes.Species.trim()))
    .map(o => ({
      name: o.attributes.Species.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'amherst_ma_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
