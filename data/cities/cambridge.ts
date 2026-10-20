#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

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

  fs.writeFileSync(path.join(__dirname, 'cambridge.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
