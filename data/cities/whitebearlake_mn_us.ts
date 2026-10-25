#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// LOGIS-hosted White Bear Lake forestry tree inventory
async function main() {
  const endpoint = 'https://utility.arcgis.com/usrsvcs/servers/af97912e86f04c97b770e4f8d1b05a52/rest/services/WhiteBearLake/WBL_Forestry_Tree_Inventory_2026/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.Genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.Species ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'whitebearlake_mn_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to whitebearlake_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
