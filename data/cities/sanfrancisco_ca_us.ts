#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://data.sfgov.org/resource/tkzw-k3nq.json';

  let rows = await CityUtil.fetchSocrata(endpoint, {
      select: 'latitude,longitude,species',
      order: 'treeid',
      where: "planttype = 'Tree' AND latitude IS NOT NULL AND longitude IS NOT NULL AND species IS NOT NULL"
    }
  );

  let trees = [];
  for (let row of rows) {
    let name = row.species.split('::')[0].trim();
    if (name) {
      trees.push({
        name: name,
        lat: parseFloat(row.latitude),
        lon: parseFloat(row.longitude)
      });
    }
  }

  fs.writeFileSync(path.join(__dirname, 'sanfrancisco_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
