#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Beachwood tree layer
async function main() {
  const endpoint = 'https://services8.arcgis.com/kiqE4KVhJWv6tZKC/arcgis/rest/services/Current_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
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

  fs.writeFileSync(path.join(__dirname, 'beachwood_oh_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to beachwood_oh_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
