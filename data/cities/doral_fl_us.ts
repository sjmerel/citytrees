#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/rMDYWPzHhH9byMxO/arcgis/rest/services/Street_Tree_Inventory_Phase_I___II_view/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SCI_NAME',
    where: "SCI_NAME IS NOT NULL AND SCI_NAME <> ' ' AND SCI_NAME <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SCI_NAME.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'doral_fl_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
