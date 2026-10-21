#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Monroe, Wisconsin tree inventory (coordinates confirm Monroe WI, not Monroe MI); excludes blank/proposed sites.
async function main() {
  const endpoint = 'https://services5.arcgis.com/whF382HLJPxzhmA9/arcgis/rest/services/Tree_Inventory_View/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Scientific',
    where: "Scientific IS NOT NULL AND Scientific <> ' ' AND Scientific <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Scientific ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'monroe_wi_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to monroe_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
