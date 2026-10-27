#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official public inventory linked by https://www.knoxvilletn.gov/944/Urban-Forestry
// Only City Trees; notable trees and green-space layers are not combined with it.
// Inventory dates span 2011-2026. Condition is not guest-visible; a recommendation
// for future removal alone does not establish that an existing tree is gone.
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://knoxvilletn.treekeepersoftware.com', 'KnoxvilleTN_CityTrees', 2);

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 35.8 && o.lat < 36.2 && o.lon > -84.3 && o.lon < -83.6)
    .filter(o => {
      let siteType = o.attributes.SITE_ATTR23;
      let task = o.attributes.SITE_ATTR6;
      return typeof siteType === 'string' &&
        ['Tree', 'Community IRA Tree (Planted)', 'Trees Knoxville Tree'].includes(siteType) &&
        (typeof task !== 'string' || !/stump|^Plant Tree$/i.test(task));
    })
    .filter(o => o.name && !/^(unknown(?: tree)?|unidentified|tree)$/i.test(o.name))
    .map(o => ({
      lat: o.lat, lon: o.lon,
      // This malformed source label has a verified genus but an unreliable epithet.
      name: o.name === 'coloruna, Corylus' ? o.genus : o.name
    }));

  fs.writeFileSync(path.join(__dirname, 'knoxville_tn_us.json'), JSON.stringify(trees, null, 2));
  console.log(`knoxville_tn_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
