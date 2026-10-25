#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Village of Cayuga Heights, NY tree inventory (Cornell-hosted); BotanicNam holds the scientific name.
async function main() {
  const endpoint = 'https://services3.arcgis.com/m3XdyJh55Jrxxk0l/arcgis/rest/services/Tree_Inventory_Public/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BotanicNam',
    where: "BotanicNam IS NOT NULL AND BotanicNam <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.BotanicNam ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'cayugaheights_ny_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to cayugaheights_ny_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
