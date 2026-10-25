#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://gis.cityofwoodland.org/cowgis/rest/services/External/City_Trees/MapServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.BOTANICAL?.trim())
    .map((row: any) => ({
      name: row.attributes.BOTANICAL.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'woodland_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to woodland_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
