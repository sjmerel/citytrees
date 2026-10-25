#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/WebMap_YorbaLinda_AllLayers_WFL1/FeatureServer/0';

  let rows = await CityUtil.fetchArcGis(endpoint, {
      fields: 'BotanicalN',
      where: "BotanicalN IS NOT NULL AND BotanicalN <> '' AND BotanicalN NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 30 && o.geometry.x < -100)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BotanicalN.trim()
    }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'yorbalinda_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
