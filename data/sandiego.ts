#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://webmaps.sandiego.gov/arcgis/rest/services/DSD/Environment/MapServer/20';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_NAME,LATITUDE,LONGITUDE',
    where: "SPECIES_NAME IS NOT NULL AND SPECIES_NAME <> '' AND MAPNG_STAT_CD <> 'RM' AND LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES_NAME.trim(),
    lat: o.attributes.LATITUDE,
    lon: o.attributes.LONGITUDE
  }));

  fs.writeFileSync('sandiego.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();
