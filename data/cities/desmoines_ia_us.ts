#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official public inventory linked by https://www.dsm.city/departments/public_works/forestry/
// Excludes the separate "Recent and Requested Plantings" map layer.
// Inventory dates span 2015-2026. Condition is not exposed to guests, so active
// botanical records may include declining trees; vacancies/stumps/placeholders are excluded.
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://desmoinesia.treekeepersoftware.com', 'DesMoinesIA_Trees', 1);

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 41.45 && o.lat < 41.75 && o.lon > -93.8 && o.lon < -93.45)
    .filter(o => o.name && !/^(Alley|unknown tree|Z Add \d+)$/i.test(o.name))
    .map(o => ({
      lat: o.lat,
      lon: o.lon,
      // Two source entries contain only an epithet, with the genus in a separate field.
      name: ['trifolia', 'acuminata'].includes(o.name) ? `${o.genus} ${o.name}` : o.name
    }));

  fs.writeFileSync(path.join(__dirname, 'desmoines_ia_us.json'), JSON.stringify(trees, null, 2));
  console.log(`desmoines_ia_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
