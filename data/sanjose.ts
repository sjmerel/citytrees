#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/NkcnS0qk4w2wasOJ/arcgis/rest/services/San%20Jose%20Street%20Tree%20Data/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'NAMESCIENT',
    where: "NAMESCIENT IS NOT NULL AND NAMESCIENT <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.NAMESCIENT.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('sanjose.json', JSON.stringify(trees, null, 2));
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
