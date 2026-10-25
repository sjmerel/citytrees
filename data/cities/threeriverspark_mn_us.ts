#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Three Rivers Park District (MN) managed-trees layer; ScientificName holds the botanical name.
async function main() {
  const endpoint = 'https://gis.trpdmn.org/hostserver/rest/services/ManagedTrees_Public_Viewing/MapServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'ScientificName',
    where: "ScientificName IS NOT NULL AND ScientificName <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.ScientificName ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'threeriverspark_mn_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to threeriverspark_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
