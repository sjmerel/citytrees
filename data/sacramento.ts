#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/54falWtcpty3V47Z/arcgis/rest/services/City_Maintained_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: 'BOTANICAL IS NOT NULL',
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BOTANICAL.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('sacramento.json', JSON.stringify(trees, null, 2));
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
