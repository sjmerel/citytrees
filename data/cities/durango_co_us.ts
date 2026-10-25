#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// This layer never returns geometry even with returnGeometry=true, so Latitude/Longitude attributes are used instead.
async function main() {
  const endpoint = 'https://gis.durangoco.gov/map/rest/services/ParksFeatureAccess/MapServer/6';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Scientific,Latitude,Longitude',
    where: "Scientific IS NOT NULL AND Scientific <> ' '",
    returnGeometry: false
  });

  const trees = rows
    .filter((row: any) => row.attributes.Scientific?.trim() && row.attributes.Latitude && row.attributes.Longitude)
    .map((row: any) => ({
      name: row.attributes.Scientific.trim(),
      lat: row.attributes.Latitude,
      lon: row.attributes.Longitude
    }));

  fs.writeFileSync(path.join(__dirname, 'durango_co_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to durango_co_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
