#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services5.arcgis.com/0fqb8Dy41NtYm1ZO/arcgis/rest/services/Rosemead_Master_Asset_Map_2026_WFL1/FeatureServer/3';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'BotanicalName',
      where: "BotanicalName IS NOT NULL AND BotanicalName <> '' AND BotanicalName NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 30 && o.geometry.x < -100)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.BotanicalName.trim()
    }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'rosemead_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
