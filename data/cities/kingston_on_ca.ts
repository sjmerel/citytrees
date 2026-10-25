#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://utility.arcgis.com/usrsvcs/servers/511fd5299053486daf48c6466332320c/rest/services/Eng/City_Owned_Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SCIENTIFIC_NAME,RETIRED_DATE',
    where: "SCIENTIFIC_NAME IS NOT NULL AND RETIRED_DATE IS NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SCIENTIFIC_NAME.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'kingston_on_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
