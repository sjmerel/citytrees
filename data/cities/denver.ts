#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_PARK_TREEINVENTORY_P/FeatureServer/241';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_BOTANIC,X_LONG,Y_LAT',
    where: "SPECIES_BOTANIC IS NOT NULL AND SPECIES_BOTANIC <> '' AND X_LONG IS NOT NULL AND Y_LAT IS NOT NULL AND X_LONG <> 0"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES_BOTANIC.trim(),
    lat: o.attributes.Y_LAT,
    lon: o.attributes.X_LONG
  }));

  fs.writeFileSync(path.join(__dirname, 'denver.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
