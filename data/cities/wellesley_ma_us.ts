#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services6.arcgis.com/f6G5SbcwuEVmR1CW/arcgis/rest/services/OpenDataLayers2/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'ScientificName',
    where: "ScientificName IS NOT NULL AND ScientificName <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.ScientificName.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'wellesley_ma_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
