#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of San Mateo street-tree inventory; SPP holds the scientific name.
async function main() {
  const endpoint = 'https://services2.arcgis.com/g26Y0m7OCdjU0ObA/arcgis/rest/services/Street_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP IS NOT NULL AND SPP <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SPP ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'sanmateo_ca_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to sanmateo_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
