#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://data.edmonton.ca/resource/eecg-fc54.json';
  let rows = await DataUtil.fetchSocrata(endpoint, {
    select: 'genus,species_2,latitude,longitude',
    where: 'genus IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL',
    order: ':id'
  });

  let trees = [];
  for (let o of rows) {
    let lat = Number(o.latitude);
    let lon = Number(o.longitude);
    let genus = (o.genus ?? '').trim();
    let species = (o.species_2 ?? '').trim();
    if (!genus || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name: species ? `${genus} ${species}` : genus, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'edmonton_ab_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
