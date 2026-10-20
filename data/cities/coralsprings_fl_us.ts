#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/mXWZ2wsX9klsJAJY/arcgis/rest/services/Cityworks_Horticulture_Tree_Test_view_Public/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'namescientific',
    where: "namescientific IS NOT NULL AND namescientific <> '' AND namescientific <> ' '",
    returnGeometry: true
  });

  let trees = rows.filter(o => o.geometry).map(o => ({
    name: o.attributes.namescientific.trim().replace(/\s+(spp\.?|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'coralsprings_fl_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
