#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Gary public tree inventory; LATIN_NAME holds the scientific name.
async function main() {
  const endpoint = 'https://services1.arcgis.com/WK6JRyyNiFsxCE3s/arcgis/rest/services/Gary_Public_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.LATIN_NAME ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'gary_in_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to gary_in_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
