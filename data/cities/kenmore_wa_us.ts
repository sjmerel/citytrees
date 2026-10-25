#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Kenmore public tree layer; SciName holds the scientific name.
async function main() {
  const endpoint = 'https://gwa.kenmorewa.gov/arcgis/rest/services/Public_Trees/FeatureServer/22';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SciName',
    where: "SciName IS NOT NULL AND SciName <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SciName ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'kenmore_wa_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to kenmore_wa_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
