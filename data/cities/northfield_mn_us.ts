#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Carleton College-hosted City of Northfield tree inventory (summer 2024)
async function main() {
  const endpoint = 'https://services.arcgis.com/ULBqC49IEeIR01GF/arcgis/rest/services/Trees_Managed_by_City_of_Northfield_Summer_2024/FeatureServer/1';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.GENUS ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.SPECIES ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'northfield_mn_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to northfield_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
