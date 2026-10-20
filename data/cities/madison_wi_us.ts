#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://maps.cityofmadison.com/arcgis/rest/services/Public/OPEN_DATA/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "STATUS = 'Active' AND SPP_BOT IS NOT NULL AND SPP_BOT NOT IN ('Vacant', 'Plat Assessable', 'NR')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_BOT.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'madison_wi_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
