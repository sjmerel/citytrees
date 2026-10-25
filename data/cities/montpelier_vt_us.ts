#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services6.arcgis.com/ALaxfASMULIJ1PP6/arcgis/rest/services/Montpelier_Tree_Inventory_Public_Map_View/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: `${o.attributes.genus.trim()} ${(o.attributes.species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'montpelier_vt_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
