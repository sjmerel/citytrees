#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Basingstoke and Deane Borough Council tree inspections layer; Species holds the scientific name.
async function main() {
  const endpoint = 'https://gis.basingstoke.gov.uk/server/rest/services/AGOL/TreesInspections/FeatureServer/6';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species',
    where: "Species IS NOT NULL AND Species <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.Species ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'basingstoke_gb.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to basingstoke_gb.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
