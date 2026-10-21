#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/EgnL1bB7VxL4zhx7/arcgis/rest/services/Public_Tree_Inventory/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'ScientificName',
    where: "ScientificName IS NOT NULL AND ScientificName <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.ScientificName.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'sunprairie_wi_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
