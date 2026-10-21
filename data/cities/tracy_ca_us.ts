#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/jhomrVPNnIcrbVuz/arcgis/rest/services/Tree/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.BOTANICAL?.trim())
    .map((row: any) => ({
      name: row.attributes.BOTANICAL.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'tracy_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to tracy_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
