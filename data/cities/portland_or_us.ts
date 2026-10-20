#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer/1415';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: 'SPECIES IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES.split(' - ')[0].trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'portland_or_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
