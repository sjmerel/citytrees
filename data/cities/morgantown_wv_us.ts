#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Morgantown current-inspection tree layer
async function main() {
  const endpoint = 'https://services7.arcgis.com/lE5mQkgxehcTjzKf/arcgis/rest/services/Trees_currentinspection_dfc382653d0a4cce8f60666470281bf5/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.genus ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.species ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'morgantown_wv_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to morgantown_wv_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
