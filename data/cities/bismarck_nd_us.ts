#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Bismarck public tree inventory
async function main() {
  const endpoint = 'https://services1.arcgis.com/XxHmL09eFqJWI0gE/arcgis/rest/services/Trees_public_3694a69174e146b3b4b24d82a90c198a/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.species ?? '').trim();
    if (species.toLowerCase() === 'unknown') return [];
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'bismarck_nd_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to bismarck_nd_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
