#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://utility.arcgis.com/usrsvcs/servers/d2d68a325c9843f68e84805f5295b1a3/rest/services/Operations_Maintenance/trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL AND BOTANICALN <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.BOTANICALN))
    .map(o => ({
      name: o.attributes.BOTANICALN.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'orangecounty_ca_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
