#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/i4mrGZu1Isvl0rWt/arcgis/rest/services/PD_Trees/FeatureServer/6';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL AND BOTANICALN <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.BOTANICALN))
    .map(o => ({
      name: o.attributes.BOTANICALN.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'palmdesert_ca_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
