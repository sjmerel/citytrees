#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// University of Minnesota-hosted reduced copy of the Minneapolis public street-tree inventory; SPP already holds full scientific names (occasionally with cultivar).
async function main() {
  const endpoint = 'https://services.arcgis.com/8df8p0NlLFEShl0r/arcgis/rest/services/minneapolis_public_trees_reduced/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP IS NOT NULL AND SPP <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.SPP ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'minneapolis_mn_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to minneapolis_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
