#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/aT1T0pU1ZdpuDk1t/arcgis/rest/services/Durham_StreetTree_Inventory_23May2025/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species,present',
    where: "present = 'Tree' AND genus IS NOT NULL AND genus <> '' AND genus <> ' '",
    returnGeometry: true
  });

  // species is blank when only the genus is known
  let trees = rows.filter(o => o.geometry).map(o => ({
    name: `${o.attributes.genus.trim()} ${(o.attributes.species ?? '').trim().replace(/^(sp|spp)\.?$/i, '')}`.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'durham_nc_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
