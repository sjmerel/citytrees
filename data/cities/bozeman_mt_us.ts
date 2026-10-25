#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://gisweb.bozeman.net/arcgis/rest/services/Internal/Forestry_Dashboard/MapServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Botanical_Name',
    where: "Botanical_Name IS NOT NULL AND Botanical_Name <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/^(n\/a|unknown)/i.test(o.attributes.Botanical_Name.trim()))
    .map(o => ({
      name: o.attributes.Botanical_Name.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'bozeman_mt_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
