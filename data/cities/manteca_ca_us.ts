#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/apvcu8kifKuj4Ua8/arcgis/rest/services/Trees_(Public)/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical',
    where: "Botanical IS NOT NULL AND Botanical <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.Botanical))
    .map(o => ({
      name: o.attributes.Botanical.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'manteca_ca_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
