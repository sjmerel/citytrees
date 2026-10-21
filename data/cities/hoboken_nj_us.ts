#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services8.arcgis.com/LDmC4ZVHdfKcEzxl/arcgis/rest/services/2023_Tree_Inventory_/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Status = 'Tree'",
    returnGeometry: true
  });

  const trees = rows.flatMap(o => {
    const genus = (o.attributes.Genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.Species ?? '').trim();
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat: o.geometry.y,
      lon: o.geometry.x
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'hoboken_nj_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
