#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.cityofdubuque.org/arcgisweb2/rest/services/Tree_Management/Tree_Collection_Publishing_Public_Version/FeatureServer/5';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: `${o.attributes.GENUS.trim()} ${(o.attributes.SPECIES ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'dubuque_ia_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
