#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of San Juan Capistrano parkway/ROW tree inventory; BOTANICAL holds the scientific name.
async function main() {
  const endpoint = 'https://services5.arcgis.com/NUp4yl2gULzlAcEm/arcgis/rest/services/ParkwaysROW_Hosted/FeatureServer/3';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL AND BOTANICAL <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.BOTANICAL ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'sanjuancap_ca_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to sanjuancap_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
