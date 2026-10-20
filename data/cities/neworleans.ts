#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://data.nola.gov/resource/3tyj-9x33.json';
  let rows = await DataUtil.fetchSocrata(endpoint, {
    select: 'botanical,the_geom',
    where: 'botanical IS NOT NULL AND the_geom IS NOT NULL',
    order: 'objectid'
  });

  let trees = rows.map(o => ({
    name: o.botanical.trim(),
    lat: o.the_geom.coordinates[1],
    lon: o.the_geom.coordinates[0]
  }));

  fs.writeFileSync(path.join(__dirname, 'neworleans.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
