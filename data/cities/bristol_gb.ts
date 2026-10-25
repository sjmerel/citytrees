#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps2.bristol.gov.uk/server2/rest/services/ext/ll_environment_and_planning/MapServer/32';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/vacant|stump|unknown|^none$|no tree/i.test(o.attributes.LATIN_NAME) && !/species unknown/i.test(o.attributes.LATIN_NAME))
    .map(o => ({
      name: o.attributes.LATIN_NAME.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'bristol_gb.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
