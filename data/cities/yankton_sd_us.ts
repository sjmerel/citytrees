#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/aVepqWph7Jkj1aWl/arcgis/rest/services/Trees_public_7114d04be2ec4cd1a370716cb2f3f475/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/^(n\/a|unknown|stump)/i.test(o.attributes.genus.trim()))
    .map(o => ({
      name: `${o.attributes.genus.trim()} ${(o.attributes.species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'yankton_sd_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
