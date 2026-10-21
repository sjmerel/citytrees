#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// University of Illinois-hosted 2024 Champaign city-owned tree inventory; SPP holds the scientific name, excludes vacant sites.
async function main() {
  const endpoint = 'https://services.arcgis.com/GL0fWlNkwysZaKeV/arcgis/rest/services/Bruce_2024_Champaign_Owned_Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP IS NOT NULL AND SPP <> '' AND SPP NOT LIKE 'vacant%'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SPP ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'champaign_il_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to champaign_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
