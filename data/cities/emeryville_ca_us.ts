#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Emeryville WCA tree inventory; BotanicalN holds the scientific name, excludes vacant/unidentified sites.
async function main() {
  const endpoint = 'https://services3.arcgis.com/ljOdqLVbHpS7dOJQ/arcgis/rest/services/WCA_Tree_Inventory/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalN',
    where: "BotanicalN IS NOT NULL AND BotanicalN NOT LIKE '%acant site%' AND BotanicalN NOT LIKE '%nidentified%'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.BotanicalN ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'emeryville_ca_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to emeryville_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
