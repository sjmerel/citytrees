#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City GIS Tree Inventory - Explorer, linked through https://www.mariettaoh.net/how_do_i/learn_about/maps_gis.php
// The 2025 export is largely a 2007 survey with some updates through 2024.
// 1969 dates are placeholders, not evidence of inspection. Exclude known removed,
// dead, stump and planting sites; recommendations for future removal alone remain.
async function main() {
  let endpoint = 'https://services2.arcgis.com/nmiTqKBr781zgH63/arcgis/rest/services/Tree_Inventory2025_Public_View_/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SpeciesB',
    where: "RemovedStatus = 'No' AND (Conditions IS NULL OR Conditions <> 'Dead') AND SpeciesB IS NOT NULL AND (MaintenanceNotes IS NULL OR MaintenanceNotes NOT IN ('Stump', 'Plant 1', 'Plant 2', 'Don''t Plant'))",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 39.35 && o.geometry.y < 39.5 &&
      o.geometry.x > -81.55 && o.geometry.x < -81.35)
    .map(o => ({
      lat: o.geometry.y, lon: o.geometry.x,
      name: o.attributes.SpeciesB.replace(/\s+/g, ' ').trim()
    }))
    .filter(o => o.name && !/^(Unknown|Stump|Vacant Site|Shrub|Snowbell|Wood Carving|Poplar species)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'marietta_oh_us.json'), JSON.stringify(trees, null, 2));
  console.log(`marietta_oh_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
