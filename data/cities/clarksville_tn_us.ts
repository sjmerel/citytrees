#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official public parks/facilities inventory linked by
// https://www.clarksvilletn.gov/519/Tree-Board
// Tree Sites already includes the TAEP grant sites; do not combine both layers.
// Survey dates and condition/removal fields are not guest-visible.
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://clarksvilletn.treekeepersoftware.com', 'ClarksvilleTN_TreeSites', 1,
    'https://geocomyt.daveytreekeeper.com/geoserver/Treekeeper/ows');

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 36.3 && o.lat < 36.75 && o.lon > -87.6 && o.lon < -87.1)
    .filter(o => o.name && !/^(Z Add \d+|unknown(?: tree)?)$/i.test(o.name))
    .map(o => ({
      lat: o.lat, lon: o.lon,
      name: o.name
        .replace(/^Ilex x attenuata-Fosteri$/, "Ilex x attenuata 'Fosteri'")
        .replace(/^Magnolia grandiflora-little gem$/, "Magnolia grandiflora 'Little Gem'")
        .replace(/^(Ulmus|Quercus) x$/, '$1')
        .replace(/^Prunus shrubs$/, 'Prunus')
    }));

  fs.writeFileSync(path.join(__dirname, 'clarksville_tn_us.json'), JSON.stringify(trees, null, 2));
  console.log(`clarksville_tn_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
