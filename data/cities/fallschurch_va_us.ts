#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Falls Church public tree layer; SPECIES holds the scientific name.
async function main() {
  const endpoint = 'https://services1.arcgis.com/2hmXRAz4ofcdQP6p/arcgis/rest/services/Public_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL AND SPECIES <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SPECIES ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'fallschurch_va_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to fallschurch_va_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
