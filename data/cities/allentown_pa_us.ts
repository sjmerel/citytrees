#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/WUqVDRuvIiIiH2Pl/arcgis/rest/services/City_Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'TR_GENUS',
    where: "TR_GENUS IS NOT NULL AND TR_GENUS <> '' AND TR_GENUS NOT LIKE '%aceae'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.TR_GENUS.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'allentown_pa_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
