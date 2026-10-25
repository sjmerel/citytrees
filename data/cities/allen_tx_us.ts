#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://gismaps.cityofallen.org/arcgis/rest/services/Trees/MapServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'CommonScientificName,Genus',
    where: "LifeCycleStatus = 'Active'",
    returnGeometry: true
  });

  // CommonScientificName looks like "Oak, Live (Quercus virginiana)"; fall back to the genus field
  let trees = rows.filter(o => o.geometry).map(o => {
    let match = /\(([^)]+)\)/.exec(o.attributes.CommonScientificName ?? '');
    return {
      name: (match ? match[1] : (o.attributes.Genus ?? '')).trim().replace(/\s+(spp\.?|sp\.?)$/i, ''),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  }).filter(t => t.name);

  fs.writeFileSync(path.join(__dirname, 'allen_tx_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
