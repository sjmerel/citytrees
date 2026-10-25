#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchSocrata('https://data.providenceri.gov/resource/b77h-59tz.json', {
    select: 'spp,the_geom',
    where: "spp IS NOT NULL AND the_geom IS NOT NULL",
    order: ':id'
  });

  let trees = rows.map(o => ({
    name: o.spp.trim(),
    lat: parseFloat(o.the_geom.coordinates[1]),
    lon: parseFloat(o.the_geom.coordinates[0])
  }));

  fs.writeFileSync(path.join(__dirname, 'providence_ri_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
