#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services8.arcgis.com/deR2GmCznCnyAVvu/arcgis/rest/services/Forestry_Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const genus = String(row.attributes.Genus ?? '').trim();
    const species = String(row.attributes.Species ?? '').trim();
    const name = species ? `${genus} ${species}` : genus;
    if (!row.geometry || !genus) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'grandchute_wi_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to grandchute_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
