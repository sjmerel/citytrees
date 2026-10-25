#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://data.cityofnewyork.us/resource/hn5i-inap.json';

  let rows = await CityUtil.fetchSocrata(endpoint, {
      select: 'genusspecies,location',
      order: 'objectid',
      where: "tpstructure = 'Full' AND genusspecies IS NOT NULL AND location IS NOT NULL"
    }
  );

  let trees = rows.map(o => ({
    name: o.genusspecies.split(' - ')[0].trim(),
    lat: o.location.coordinates[1],
    lon: o.location.coordinates[0]
  }));

  fs.writeFileSync(path.join(__dirname, 'newyorkcity_ny_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
