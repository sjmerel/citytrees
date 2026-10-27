#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official Public Works Digital Twin street-tree layer, WCA inventory.
// Survey dates are 2009-2010; the map's publication date is not a new survey.
async function main() {
  let endpoint = 'https://gisportal.ontarioca.gov/server/rest/services/Public_Works_Digital_Twin_MIL1/MapServer/37';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'botanical,maintenanc',
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 33.9 && o.geometry.y < 34.15 &&
      o.geometry.x > -117.8 && o.geometry.x < -117.45)
    .filter(o => o.attributes.botanical &&
      !/^(Dead Tree|Stump|Vacant site|Other tree|Palm spp\.)$/i.test(o.attributes.botanical.trim()) &&
      !/^(Plant|Removal-Dead|Removal-Stump)$/i.test(o.attributes.maintenanc?.trim() ?? ''))
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.botanical.replace(/\s+/g, ' ').trim()
        .replace(/^Malus spp\. & cv\.$/, 'Malus')
    }))
    .filter(o => o.name);

  fs.writeFileSync(path.join(__dirname, 'ontario_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`ontario_ca_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
