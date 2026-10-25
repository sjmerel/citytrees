#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchArcGis(
    'https://services.arcgis.com/yeXpdyjk3azbqItW/arcgis/rest/services/ParksAndRecreation/FeatureServer/1',
    { where: "Mode = 'active' AND GenusSpecies IS NOT NULL", fields: 'GenusSpecies', returnGeometry: true });
  let trees = [];

  for (let row of rows) {
    let name = (row.attributes.GenusSpecies ?? '').trim().replace(/\s+/g, ' ').replace(/ (species|spp?\.?)$/i, '');
    let lat = row.geometry?.y;
    let lon = row.geometry?.x;
    if (!name || /^(unknown|not recorded|vacant.*)$/i.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'launceston_tas_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
