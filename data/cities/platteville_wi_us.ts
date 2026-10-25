#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Non-tree placeholder rows (vacant sites, stumps, and the joke Latin "Truncus perplexaturum") are excluded.
const skip = /vacant|stump|truncus/i;

async function main() {
  const endpoint = 'https://services3.arcgis.com/YwCuPGYdQw7hiTj1/arcgis/rest/services/Public_Trees_(View)/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.BOTANICAL?.trim() && !skip.test(row.attributes.BOTANICAL))
    .map((row: any) => ({
      name: row.attributes.BOTANICAL.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'platteville_wi_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to platteville_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
