#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services7.arcgis.com/DbKiZP6rBmETqLvl/arcgis/rest/services/City_of_Berwyn_Tree_Inventory/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.LATIN_NAME.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'berwyn_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
