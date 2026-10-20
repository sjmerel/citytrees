#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services.arcgis.com/hVnyNvwbpFFPDV5j/arcgis/rest/services/ClaremontCityTreeFeature/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'BotName',
      where: "BotName IS NOT NULL AND BotName <> '' AND BotName NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows.filter(o => o.geometry).map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x,
    name: o.attributes.BotName.trim()
  }));

  fs.writeFileSync(path.join(__dirname, 'claremont_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
