#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// OpenLethbridge municipal tree layer; botn_name already holds the full botanical name (with cultivar where applicable).
async function main() {
  const endpoint = 'https://gis.lethbridge.ca/gisopendata/rest/services/OpenData/odl_trees/MapServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'botn_name',
    where: "botn_name IS NOT NULL AND botn_name <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.botn_name ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'lethbridge_ab_ca.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to lethbridge_ab_ca.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
