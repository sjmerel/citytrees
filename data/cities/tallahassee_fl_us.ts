#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/ptvDyBs1KkcwzQNJ/arcgis/rest/services/Tree_2023/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical',
    where: "Botanical IS NOT NULL AND Botanical <> '' AND Botanical NOT IN ('Stump', 'Snag')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Botanical.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'tallahassee_fl_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
