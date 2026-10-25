#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Village of Shorewood, Wisconsin tree inventory
async function main() {
  const endpoint = 'https://services6.arcgis.com/WCuPctHy89ccTjFo/arcgis/rest/services/Tree_Inventory_Viewer/FeatureServer/1';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,species_1',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.Genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.species_1 ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'shorewood_wi_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to shorewood_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
