#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Municipal inventory linked by https://dallascityhall.com/projects/forestry/Pages/Inventory.aspx
// Trees 2024 is the largest public individual-tree layer. This ongoing inventory
// is not citywide coverage. Do not combine the older Tree Sites or Smart Tree
// Inventory layers without resolving overlap; Ash/EAB layers are alternate views.
// Guest fields do not expose condition or individual survey dates.
async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://dallastx.treekeepersoftware.com', 'DallasTX_Trees2024', 5,
    'https://geocom3.daveytreekeeper.com/geoserver/Treekeeper/ows',
    { coordinatesFromGrid: true });

  let trees = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 32.6 && o.lat < 33.05 && o.lon > -97.05 && o.lon < -96.45)
    .filter(o => o.name && !/^(Unknown(?: .*)?|Unassigned|Z Add \d+)$/i.test(o.name))
    .map(o => ({ lat: o.lat, lon: o.lon, name: o.name }));

  fs.writeFileSync(path.join(__dirname, 'dallas_tx_us.json'), JSON.stringify(trees, null, 2));
  console.log(`dallas_tx_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
