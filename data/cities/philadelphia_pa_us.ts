#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/ppr_tree_inventory_2025/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'tree_name',
    where: "tree_name IS NOT NULL AND tree_name <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.tree_name.split(' - ')[0].trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'philadelphia_pa_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
