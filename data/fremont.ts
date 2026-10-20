#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  // Slow server (30-90s per page).
  let endpoint = 'https://egis.fremont.gov/accela/rest/services/CRM/TreeInventory/MapServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SCIENTIFIC,LAT,LON',
    where: "STATUS = 'Alive' AND SCIENTIFIC IS NOT NULL AND SCIENTIFIC <> '' AND LAT IS NOT NULL AND LON IS NOT NULL"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SCIENTIFIC.trim(),
    lat: o.attributes.LAT,
    lon: o.attributes.LON
  }));

  fs.writeFileSync('fremont.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
