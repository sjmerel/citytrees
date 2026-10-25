#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Tumwater street-tree layer; Scientific_Name holds the botanical name.
async function main() {
  const endpoint = 'https://services6.arcgis.com/ovypB8ighP2NPfFE/arcgis/rest/services/Street_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Scientific_Name',
    where: "Scientific_Name IS NOT NULL AND Scientific_Name <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Scientific_Name ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'tumwater_wa_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to tumwater_wa_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
