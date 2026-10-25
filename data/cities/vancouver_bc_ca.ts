#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
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

  fs.writeFileSync(path.join(__dirname, 'vancouver_bc_ca.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
