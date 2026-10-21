#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Hutt City Council street-tree layer; Botanical_ holds the scientific name.
async function main() {
  const endpoint = 'https://services1.arcgis.com/DlsnLEhGfXazS5Er/arcgis/rest/services/Street_Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Botanical_',
    where: "Botanical_ IS NOT NULL AND Botanical_ <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Botanical_ ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'hutt_nz.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to hutt_nz.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
