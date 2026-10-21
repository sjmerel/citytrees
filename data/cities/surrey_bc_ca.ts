#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

function titleCase(s: string) {
  return s.trim().replace(/^./, c => c.toUpperCase());
}

async function main() {
  let endpoint = 'https://services5.arcgis.com/YRpe0VKTJytZSSIB/arcgis/rest/services/Park%20Specimen%20Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'TREE_GENUS,TREE_SPECIES',
    where: "TREE_GENUS IS NOT NULL AND TREE_SPECIES IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${titleCase(o.attributes.TREE_GENUS)} ${o.attributes.TREE_SPECIES.trim().toLowerCase()}`,
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'surrey_bc_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
