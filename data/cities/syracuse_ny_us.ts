#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services6.arcgis.com/bdPqSfflsdgFRVVM/arcgis/rest/services/Syracuse_Tree_Data/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "SPP_BOT IS NOT NULL AND SPP_BOT <> '' AND SPP_BOT NOT LIKE '%Planting Site%' AND SPP_BOT NOT LIKE '%Stump%' AND SPP_BOT NOT LIKE '%Butt Log%' AND SPP_BOT NOT IN ('VARIOUS', 'Vegetation')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_BOT.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'syracuse_ny_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
