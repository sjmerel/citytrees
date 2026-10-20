#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services9.arcgis.com/ivAMP6vRMPA12GAA/arcgis/rest/services/Monterey_Park_trees/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'BOTANICALN',
      where: "BOTANICALN IS NOT NULL AND BOTANICALN <> '' AND BOTANICALN NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows.filter(o => o.geometry).map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x,
    name: o.attributes.BOTANICALN.trim()
  }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'montereypark_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
