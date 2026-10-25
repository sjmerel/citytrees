#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/1DyhsVa6rviDKn5t/arcgis/rest/services/Shade_Map_WSL1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Scientific_Name',
    where: "Scientific_Name IS NOT NULL AND Scientific_Name <> ' ' AND Scientific_Name <> ''",
    returnGeometry: true
  });

  // "Ilex spp" / "Celtis species" are genus-only entries
  let trees = rows.map(o => ({
    name: o.attributes.Scientific_Name.trim().replace(/\s+(spp\.?|species|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'plano_tx_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
