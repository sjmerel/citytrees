#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  // The public ROW inventory's GENUS field is available for these records; species codes are not botanical names.
  let endpoint = 'https://services1.arcgis.com/rXJ6QApc2sOtl1Pd/arcgis/rest/services/ROW_Tree_Inventory/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS',
    where: "GENUS IS NOT NULL AND GENUS <> '' AND GENUS NOT IN ('shrub', 'site', 'stump', 'unknown')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.GENUS.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'naperville_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
