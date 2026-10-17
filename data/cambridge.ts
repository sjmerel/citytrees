#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://data.cambridgema.gov/resource/82zb-7qc9.json';
  let rows = await DataUtil.fetchSocrata(endpoint, {
    select: 'scientific,treeid,the_geom',
    where: 'scientific IS NOT NULL AND the_geom IS NOT NULL',
    order: 'treeid'
  });

  let trees = rows.map(o => ({
    name: o.scientific.trim(),
    lat: o.the_geom.coordinates[1],
    lon: o.the_geom.coordinates[0]
  }));

  fs.writeFileSync('cambridge.json', JSON.stringify(trees, null, 2));
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
