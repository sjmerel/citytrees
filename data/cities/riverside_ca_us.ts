#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services.arcgis.com/Fu2oOWg1Aw7azh41/arcgis/rest/services/Street_Trees/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'BotanicalName',
      where: "BotanicalName IS NOT NULL AND BotanicalName <> '' AND BotanicalName NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows.filter(o => o.geometry).map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x,
    name: o.attributes.BotanicalName.trim()
  }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none|not city planted)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'riverside_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
