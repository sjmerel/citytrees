#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://data.austintexas.gov/resource/7aq7-a66u.json';
  let rows = await DataUtil.fetchSocrata(endpoint, {
    select: 'species,the_geom',
    where: 'species IS NOT NULL AND the_geom IS NOT NULL',
    order: 'objectid'
  });

  let trees = rows.map(o => ({
    name: o.species.trim(),
    lat: o.the_geom.coordinates[1],
    lon: o.the_geom.coordinates[0]
  }));

  fs.writeFileSync('austin.json', JSON.stringify(trees, null, 2));
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
