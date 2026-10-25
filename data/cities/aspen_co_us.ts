#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/5FkYBrhNzpVtlA6F/arcgis/rest/services/Parks/FeatureServer/2';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_LA',
    where: "SPECIES_LA IS NOT NULL AND SPECIES_LA <> '' AND SPECIES_LA <> 'N/A'",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.SPECIES_LA.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'aspen_co_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
