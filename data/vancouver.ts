#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: 'GENUS IS NOT NULL AND SHAPE IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows.map(o => {
    let species = o.attributes.SPECIES;
    let name = species && species.toUpperCase() !== 'NONE'
      ? `${o.attributes.GENUS} ${species}`
      : o.attributes.GENUS;
    return { name: name.trim(), lat: o.geometry.y, lon: o.geometry.x };
  });

  fs.writeFileSync('vancouver.json', JSON.stringify(trees, null, 2));
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
