#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/L81TiOwAPO1ZvU9b/arcgis/rest/services/P2StreetTrees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL AND BOTANICAL <> ' ' AND BOTANICAL <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BOTANICAL.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'grandrapids_mi_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
