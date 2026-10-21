#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/ebVVGQwOgDoHy4wd/arcgis/rest/services/Urbana_Street_Trees_view/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_bot',
    where: "active = 1 AND Is_Vacant = 0 AND SPP_bot IS NOT NULL AND SPP_bot <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_bot.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'urbana_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
