#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Village of Orland Park public tree inventory; LATIN_NAME is the full scientific name.
async function main() {
  const endpoint = 'https://services3.arcgis.com/sVDuYsm37AMvFL49/arcgis/rest/services/Public_Trees_6-28-26/FeatureServer/1';
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

  fs.writeFileSync(path.join(__dirname, 'orlandpark_il_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to orlandpark_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
