#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://gis.baltimorecity.gov/egis/rest/services/Foresty/TreeInventory_Public/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP IS NOT NULL AND SPP <> '' AND SPP <> 'Vacant Site' AND SHAPE IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'baltimore.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
