#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://gis.goldenvalleymn.gov/server/rest/services/GoldenMap/Golden_Park_Assets/FeatureServer/50';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const name = String(row.attributes.SPECIES ?? '').trim();
    if (!row.geometry || !name) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'goldenvalley_mn_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to goldenvalley_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
