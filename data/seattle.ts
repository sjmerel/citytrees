#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Trees_CDL/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'SCIENTIFIC_NAME,SHAPE_LAT,SHAPE_LNG'
      where: 'SCIENTIFIC_NAME IS NOT NULL AND SHAPE_LAT IS NOT NULL AND SHAPE_LNG IS NOT NULL',
    }
  );

  let trees = rows.map(o => ({
    lat: o.attributes.SHAPE_LAT,
    lon: o.attributes.SHAPE_LNG,
    name: o.attributes.SCIENTIFIC_NAME,
  }));

  fs.writeFileSync('seattle.json', JSON.stringify(trees, null, 2));
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
