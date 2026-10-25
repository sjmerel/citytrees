#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://services9.arcgis.com/NtAn3q92p40X6z9O/arcgis/rest/services/COES_Trees/FeatureServer/0';

  let rows = await CityUtil.fetchArcGis(endpoint, {
      fields: 'BotanicalName',
      where: "BotanicalName IS NOT NULL AND BotanicalName NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 33.85 && o.geometry.y < 33.95 && o.geometry.x < -118.3)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BotanicalName.trim()
    }))
    .filter(o => o.name != '');

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'elsegundo_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
