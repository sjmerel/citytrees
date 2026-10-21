#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/UytyQvWmxkbjUtjg/arcgis/rest/services/Trees_(Public)/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND species IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows
    // Drop a stray outlier point or two (e.g. a SoCal coordinate) that falls
    // outside the Albury, NSW region (~-36.08, 146.91).
    .filter(o => o.geometry.y < -20 && o.geometry.y > -40 && o.geometry.x > 130 && o.geometry.x < 160)
    .map(o => ({
      name: o.attributes.species.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'albury_nsw_au.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
