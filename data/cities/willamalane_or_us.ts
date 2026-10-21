#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Willamalane Park and Recreation District (Springfield, OR) tree inventory; Scientific_Name holds the botanical name.
async function main() {
  const endpoint = 'https://services.arcgis.com/xOD9qWN2fUcwxnUM/arcgis/rest/services/Tree_Inventory_View_NR/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Scientific_Name',
    where: "Scientific_Name IS NOT NULL AND Scientific_Name <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Scientific_Name ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'willamalane_or_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to willamalane_or_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
