#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services-ap1.arcgis.com/551UnqKK1GZeDKxQ/arcgis/rest/services/Public_TOB_208_Street_Trees_OldROAM_Jun20_2025_view/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'botanicaln',
    where: "botanicaln IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.botanicaln.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'bassendean_wa_au.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
