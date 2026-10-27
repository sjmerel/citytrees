#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Akron's public Street Trees inventory. The risk layer is the same
// inventory, not additional trees. Condition/removal fields are not guest-visible.
// Survey dates are not exposed. Many records are only "Unknown medium/large/small".
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://akronoh.treekeepersoftware.com', 'AkronOH_StreetTrees', 2);

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 40.9 && o.lat < 41.25 && o.lon > -81.75 && o.lon < -81.3)
    .filter(o => o.name && !/^(Z Add \d+|unknown(?: .*)?|Unassigned|Mulberry species)$/i.test(o.name))
    .map(o => ({
      lat: o.lat, lon: o.lon,
      name: o.name.replace(/^Fraxinus excelsior Golden DesertT$/, 'Fraxinus excelsior')
    }));

  fs.writeFileSync(path.join(__dirname, 'akron_oh_us.json'), JSON.stringify(trees, null, 2));
  console.log(`akron_oh_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
