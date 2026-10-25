#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://services3.arcgis.com/HJKXwJwr6cXL7ioD/arcgis/rest/services/Tree_survey_view/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.SPP?.trim())
    .map((row: any) => ({
      name: row.attributes.SPP.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'oxford_ms_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to oxford_ms_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
