#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Field Museum-hosted Openlands 2022 Chicago-area tree-planting records; LatinName holds the scientific name.
async function main() {
  const endpoint = 'https://services2.arcgis.com/dJOijx2lWTlGQBDJ/arcgis/rest/services/CW_4345/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "LatinName IS NOT NULL AND LatinName <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.LatinName ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'chicagoarea_il_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to chicagoarea_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
