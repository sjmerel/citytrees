#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://data.oaklandca.gov/resource/4jcx-enxf.json';
  let rows = await DataUtil.fetchSocrata(endpoint, {
    select: 'objectid,species,location_1',
    where: 'species IS NOT NULL AND location_1 IS NOT NULL AND location_1.latitude IS NOT NULL',
    order: 'objectid'
  });

  let trees = rows.map(o => ({
    name: o.species.trim(),
    lat: parseFloat(o.location_1.latitude),
    lon: parseFloat(o.location_1.longitude)
  }));

  fs.writeFileSync('oakland.json', JSON.stringify(trees, null, 2));
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
