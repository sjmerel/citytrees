#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Combined_Tree_Point/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'SCIENTIFIC_NAME',
      where: "SCIENTIFIC_NAME IS NOT NULL AND SCIENTIFIC_NAME <> ''",
      returnGeometry: true
    }
  );

  let trees = rows.map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x,
    name: o.attributes.SCIENTIFIC_NAME.trim(),
  }));

  fs.writeFileSync(path.join(__dirname, 'seattle.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
