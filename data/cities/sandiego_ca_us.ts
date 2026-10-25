#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://webmaps.sandiego.gov/arcgis/rest/services/DSD/Environment/MapServer/20';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_NAME,LATITUDE,LONGITUDE',
    where: "SPECIES_NAME IS NOT NULL AND SPECIES_NAME <> '' AND MAPNG_STAT_CD <> 'RM' AND LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES_NAME.trim(),
    lat: o.attributes.LATITUDE,
    lon: o.attributes.LONGITUDE
  }));

  fs.writeFileSync(path.join(__dirname, 'sandiego_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
