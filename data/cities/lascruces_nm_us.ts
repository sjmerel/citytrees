#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Las Cruces tree survey by PlanIT Geo; Scientific holds the botanical name.
async function main() {
  const endpoint = 'https://services1.arcgis.com/ejcbAsQEUUGWEyzb/arcgis/rest/services/LasCrucesNM_TreeInventory__PlanITGeoINC_03_10_2026b/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Scientific',
    where: "Scientific IS NOT NULL AND Scientific <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Scientific ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'lascruces_nm_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to lascruces_nm_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
