#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Municipal street/park inventory linked by https://www.princetonnj.gov/1402/Tree-Inventory
// DBH Range is another rendering of these same sites, not additional coverage.
// Survey dates and condition/removal fields are not exposed to guests.
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://princetonnj.treekeepersoftware.com', 'PrincetonNJ_TreeSites', 1,
    'https://geocomyt.daveytreekeeper.com/geoserver/Treekeeper/ows');

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 40.28 && o.lat < 40.45 && o.lon > -74.78 && o.lon < -74.58)
    .filter(o => o.name && !/^(Z Add \d+|unknown(?: .*)?|Unassigned)$/i.test(o.name))
    .map(o => ({ lat: o.lat, lon: o.lon, name: o.name }));

  fs.writeFileSync(path.join(__dirname, 'princeton_nj_us.json'), JSON.stringify(trees, null, 2));
  console.log(`princeton_nj_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
