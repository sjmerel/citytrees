#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://services9.arcgis.com/l0PUGx9JqRxaCPsG/arcgis/rest/services/Lakewood_Geodatabase_Feature_Layer/FeatureServer/38';

  let rows = await CityUtil.fetchArcGis(endpoint, {
      fields: 'BOTANICALN',
      where: "BOTANICALN IS NOT NULL AND BOTANICALN <> '' AND BOTANICALN NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 30 && o.geometry.x < -100)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BOTANICALN.trim()
    }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none|poor planting site)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'lakewood_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
