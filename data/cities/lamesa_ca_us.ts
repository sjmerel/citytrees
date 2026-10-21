#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of La Mesa tree inventory; BotanicalName excludes vacant sites.
async function main() {
  const endpoint = 'https://services3.arcgis.com/iYP51zxNr6TITn6r/arcgis/rest/services/Tree_Inventory/FeatureServer/4';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BotanicalName',
    where: "BotanicalName IS NOT NULL AND BotanicalName <> '' AND BotanicalName NOT LIKE '%acant site%'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.BotanicalName ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'lamesa_ca_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to lamesa_ca_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
