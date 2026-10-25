#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://data.winnipeg.ca/resource/hfwk-jp4h.json';
  let rows = await CityUtil.fetchSocrata(endpoint, {
    select: 'botanical_name,point',
    where: 'botanical_name IS NOT NULL AND point IS NOT NULL',
    order: ':id'
  });

  let trees = [];
  for (let o of rows) {
    let [lon, lat] = o.point.coordinates;
    let name = (o.botanical_name ?? '').trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'winnipeg_mb_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
