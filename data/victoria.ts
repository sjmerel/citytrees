#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://maps.victoria.ca/server/rest/services/OpenData/OpenData_Parks/MapServer/15';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName',
    where: 'BotanicalName IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BotanicalName.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('victoria.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
