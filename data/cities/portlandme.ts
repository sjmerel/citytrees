#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://gis.portlandmaine.gov/maps/rest/services/ParksRec/Trees/MapServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName',
    where: "TreeStatus IN ('Good', 'Fair', 'Other', 'Poor/Remove') AND BotanicalName IS NOT NULL AND BotanicalName <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BotanicalName.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'portlandme.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
