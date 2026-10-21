#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Christchurch City Council open-data tree layer
async function main() {
  const endpoint = 'https://gis.ccc.govt.nz/server/rest/services/OpenData/Tree/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,BotanicName',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.Genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.BotanicName ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'christchurch_nz.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to christchurch_nz.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
