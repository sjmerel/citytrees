#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Wayne County, Indiana tree inventory; SPECIES_BO holds the scientific name, excludes vacant sites.
async function main() {
  const endpoint = 'https://services3.arcgis.com/fhBemP00ea7p7i0U/arcgis/rest/services/Tree_Inventory_2022/FeatureServer/3';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_BO',
    where: "SPECIES_BO IS NOT NULL AND SPECIES_BO <> '' AND SPECIES_BO NOT LIKE 'Vacant site%'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SPECIES_BO ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'waynecounty_in_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to waynecounty_in_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
