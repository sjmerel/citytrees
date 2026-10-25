#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

function titleCase(s: string) {
  return s.trim().toLowerCase().replace(/^./, c => c.toUpperCase());
}

async function main() {
  let endpoint = 'https://data.calgary.ca/resource/tfs4-3wwa.json';
  let rows = await CityUtil.fetchSocrata(endpoint, {
    select: 'genus,species,point',
    where: "asset_type = 'TREE' AND genus IS NOT NULL AND point IS NOT NULL",
    order: ':id'
  });

  let trees = [];
  for (let o of rows) {
    let [lon, lat] = o.point.coordinates;
    let genus = titleCase(o.genus);
    let species = (o.species ?? '').trim().toLowerCase();
    if (!genus || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name: species ? `${genus} ${species}` : genus, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'calgary_ab_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
