#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official parks/municipal-grounds inventory, not citywide street coverage.
// Inspection dates span 2010-2026; recent service edits are not new inspections.
async function main() {
  let endpoint = 'https://gis2.arlingtontx.gov/agsext2/rest/services/Parks/ParksAccessory/MapServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'ScientificName',
    where: "Inactive = 0 AND IsStump = 0 AND ScientificName IS NOT NULL AND (EstimatedCCR IS NULL OR EstimatedCCR NOT LIKE 'Removed%')",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 32.5 && o.geometry.y < 32.85 &&
      o.geometry.x > -97.3 && o.geometry.x < -97)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.ScientificName.trim()
        .replace(/\s+(Brandon|Mexican|Oklahoma)$/, '')
    }))
    .filter(o => o.name && o.name !== 'Ilex x Nellie R. Stevens');

  fs.writeFileSync(path.join(__dirname, 'arlington_tx_us.json'), JSON.stringify(trees, null, 2));
  console.log(`arlington_tx_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
