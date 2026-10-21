#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services8.arcgis.com/jzdN07B7ZhRTxuzU/arcgis/rest/services/Lincoln_Trees_2017/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Scientific',
    where: "LifeCycle = 'Active' AND Scientific IS NOT NULL AND Scientific <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Scientific.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'lincoln_ne_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
