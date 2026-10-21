#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services.arcgis.com/f48yV21HSEYeCYMI/arcgis/rest/services/Tree_Inventory_2025_(View)/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName,CityMaintained',
    where: "CityMaintained = ' Yes' AND BotanicalName IS NOT NULL AND BotanicalName <> ''",
    returnGeometry: true
  });

  const trees = rows.map(row => ({
    name: row.attributes.BotanicalName.trim(),
    lat: row.geometry.y,
    lon: row.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'palmsprings_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
