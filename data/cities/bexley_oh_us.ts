#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/TBWAZXjd2RpkWRX5/arcgis/rest/services/Bexley_Tree_Inventory/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical_Name,Active_Retired',
    where: "Botanical_Name IS NOT NULL AND Botanical_Name <> '' AND (Active_Retired IS NULL OR Active_Retired <> 'Retired')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Botanical_Name.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'bexley_oh_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
