#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://maps.cityofevanston.org/arcgis/rest/services/OpenData/ArcGISOpenData/MapServer/8';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP,LifeCycle',
    where: "LifeCycle = 'Active Tree' AND SPP IS NOT NULL AND SPP <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'evanston_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
