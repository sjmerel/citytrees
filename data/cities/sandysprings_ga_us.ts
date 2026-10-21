#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/buITjRsK0rZsAXbQ/arcgis/rest/services/Public_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "SPP_BOT IS NOT NULL AND SPP_BOT <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.SPP_BOT.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'sandysprings_ga_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
