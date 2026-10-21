#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://maps.mountainview.gov/arcgis/rest/services/Public/Trees/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL AND SPECIES <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.SPECIES))
    .map(o => ({
      name: o.attributes.SPECIES.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'mountainview_ca_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
