#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/m4mbGGEvcQUVsnNy/arcgis/rest/services/Tree_Inventory_DisplayView/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical_Name',
    where: "Botanical_Name IS NOT NULL AND Botanical_Name <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Botanical_Name.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'shoreline_wa_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
