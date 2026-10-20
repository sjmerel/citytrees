#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

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

  fs.writeFileSync(path.join(__dirname, 'austin.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
