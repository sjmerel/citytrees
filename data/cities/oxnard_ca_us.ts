#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.oxnard.org/arcgis/rest/services/ParksLayers/MapServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL AND UPPER(BOTANICALN) NOT LIKE '%VACANT%' AND UPPER(BOTANICALN) NOT LIKE '%STUMP%'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BOTANICALN.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'oxnard_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
