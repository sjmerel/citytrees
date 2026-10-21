#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Salem, Massachusetts street-tree layer; Sci_Name holds the botanical name, excludes stump/pit records.
async function main() {
  const endpoint = 'https://services9.arcgis.com/nPsFhwkdebYjxn1R/arcgis/rest/services/Salem_Street_Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Sci_Name',
    where: "Sci_Name IS NOT NULL AND Sci_Name <> '' AND Sci_Name <> 'n/a'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Sci_Name ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'salem_ma_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to salem_ma_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
