#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Port Hueneme Public Works Department's inventory, verified 2026-10-21.
// https://www.arcgis.com/home/item.html?id=e4cd87554f534bf28639bd35237d7fdc
// Records include 2023-2025 additions. Exclude explicit Oxnard/unspecified-city records
// to avoid uncertain coverage and overlap with the existing Oxnard inventory.
async function main() {
  const endpoint = 'https://services5.arcgis.com/vow2JQrQyQruqkp7/arcgis/rest/services/COPH_Trees_WFL1/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LatinName,City,Status,Condition,Archived',
    where: "City = 'Port Hueneme' AND Status = 'Alive'",
    returnGeometry: true
  });
  const trees = rows.flatMap(row => {
    const attributes = row.attributes;
    const name = String(attributes.LatinName ?? '').trim();
    const condition = String(attributes.Condition ?? '').trim().toLowerCase();
    const lat = row.geometry?.y;
    const lon = row.geometry?.x;
    if (attributes.City !== 'Port Hueneme' || attributes.Status !== 'Alive' ||
        String(attributes.Archived).trim().toLowerCase() === 'yes' ||
        ['dead', 'stump', 'vacancy'].includes(condition) ||
        !name || /^(vacant|unknown)\b/i.test(name) ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'porthueneme_ca_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
