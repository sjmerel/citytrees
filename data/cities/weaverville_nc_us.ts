#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Town-published inventory, verified 2026-10-21; survey date is not established.
// https://www.arcgis.com/home/item.html?id=c7b2caa071c04948ab4c20a00e8919f2
// Botanical includes genus-only "spp." entries. The two corrections below were
// confirmed against Common ("Northern Red Oak" and "European beech").
async function main() {
  const endpoint = 'https://services5.arcgis.com/lA7fMEY4qaPiZF6g/arcgis/rest/services/Weaverville_Tree_Inventory/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical,Condition',
    returnGeometry: true
  });
  const corrections: Record<string, string> = {
    'Qurcus rubra': 'Quercus rubra',
    'Magus sylvatica': 'Fagus sylvatica'
  };
  const trees = rows.flatMap(row => {
    const raw = String(row.attributes.Botanical ?? '').trim();
    const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
    const name = corrections[capitalized] ?? capitalized;
    const condition = String(row.attributes.Condition ?? '').trim().toLowerCase();
    const lat = row.geometry?.y;
    const lon = row.geometry?.x;
    if (!name || ['dead', 'stump', 'vacant'].includes(condition) ||
        /^(unknown|vacant|stump|n\/a)\b/i.test(name) ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'weaverville_nc_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
