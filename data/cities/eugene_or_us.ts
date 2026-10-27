#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official live inventory; individual survey dates are not exposed.
// Tree_species combines botanical and common names, with legacy spacing and separators.
async function main() {
  let endpoint = 'https://services3.arcgis.com/F7NiRLGNbA2hh7gE/arcgis/rest/services/Public_Trees_View_1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Tree_species',
    where: "site_typ = 'T' AND Tree_species IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 43.9 && o.geometry.y < 44.2 &&
      o.geometry.x > -123.3 && o.geometry.x < -122.9)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.Tree_species.replace(/\u200e/g, '').replace(/\s+/g, ' ')
        .split(/\s[-\u2013]\s/)[0].trim().replace(/,\s*spp$/i, ' spp')
    }))
    .filter(o => o.name && !/^(unknown|other|palm species|zelkova,japanese)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'eugene_or_us.json'), JSON.stringify(trees, null, 2));
  console.log(`eugene_or_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
