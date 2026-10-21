#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Field format is "Genus species - (Common name)"; genus-only entries use "spp." and are skipped.
const skip = /\bspp?\.?$/i;

async function main() {
  const endpoint = 'https://services.arcgis.com/kIA6yS9KDGqZL7U3/arcgis/rest/services/CityTrees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'TREE_GENUS_SPECIES',
    where: "TREE_GENUS_SPECIES IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const raw = String(row.attributes.TREE_GENUS_SPECIES ?? '').trim();
    const match = raw.match(/^(.*?)\s*-\s*\(/);
    const name = (match ? match[1] : raw).trim();
    if (!row.geometry || !name || skip.test(name)) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'salem_or_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to salem_or_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
