#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/F1v0ufATbBQScMtY/arcgis/rest/services/CLV_Tree_Sites/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT,LATITUDE,LONGITUDE',
    where: "STATUS IN ('Tree', 'Palm') AND SPP_BOT IS NOT NULL AND SPP_BOT <> '' AND SPP_BOT NOT LIKE '%nknown%' AND LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_BOT.trim(),
    lat: o.attributes.LATITUDE,
    lon: o.attributes.LONGITUDE
  }));

  fs.writeFileSync(path.join(__dirname, 'lasvegas.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
