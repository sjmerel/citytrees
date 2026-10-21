#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/uFSCv839a7S1MRb7/arcgis/rest/services/tree_inventory/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL AND SPECIES <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.SPECIES.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'fortstjohn_bc_ca.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
