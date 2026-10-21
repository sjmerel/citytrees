#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Latrobe City Council tree inventory
async function main() {
  const endpoint = 'https://services-ap1.arcgis.com/AtixmNNZDz8cwc9l/arcgis/rest/services/Tree_Inventory_All%20View/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.species ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'latrobe_vic_au.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to latrobe_vic_au.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
