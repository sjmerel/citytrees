#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Entries that are not actual trees, and a handful of rows with (0, 0) placeholder coordinates
const skip = /vacant site|not city planted/i;

async function main() {
  const endpoint = 'https://services7.arcgis.com/uRrQ0O3z2aaiIWYU/arcgis/rest/services/Public_tree_inventory/FeatureServer/33';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICALN',
    where: "BOTANICALN IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && Math.abs(row.geometry.y) > 1 && row.attributes.BOTANICALN?.trim() && !skip.test(row.attributes.BOTANICALN))
    .map((row: any) => ({
      name: row.attributes.BOTANICALN.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'menlopark_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to menlopark_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
