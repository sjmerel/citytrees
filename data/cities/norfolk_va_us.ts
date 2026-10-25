#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchSocrata('https://data.norfolk.gov/resource/cmvv-agyb.json', {
    select: 'genus,species,latitude,longitude',
    where: "genus IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL",
    order: ':id'
  });

  let trees = rows.map(o => ({
    name: (o.genus.trim() + ' ' + (o.species ?? '').trim()).trim(),
    lat: parseFloat(o.latitude),
    lon: parseFloat(o.longitude)
  }));

  fs.writeFileSync(path.join(__dirname, 'norfolk_va_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
