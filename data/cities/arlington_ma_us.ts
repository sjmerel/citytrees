#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/s1Sh73K7qtP9JdrG/arcgis/rest/services/Public_Shade_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> '' AND RemovedDate IS NULL AND SpaceStatus = 'Planted'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: (o.attributes.Genus.trim() + ' ' + (o.attributes.Species ?? '').trim()).trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'arlington_ma_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
