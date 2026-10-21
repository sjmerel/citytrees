#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Village of Westchester, Illinois public tree layer; LATIN_NAME holds the scientific name.
async function main() {
  const endpoint = 'https://services.arcgis.com/0ofY9RQ0ZCO4aRRx/arcgis/rest/services/Westchester_Public_Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.LATIN_NAME ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'westchester_il_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to westchester_il_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
