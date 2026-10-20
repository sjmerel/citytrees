#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/9tC74aDHuml0x5Yz/arcgis/rest/services/Oakland_Public_Tree_Inventory_/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species___botanical',
    where: "Species___botanical IS NOT NULL AND Public_Tree = 'Yes'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Species___botanical.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'oakland_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
