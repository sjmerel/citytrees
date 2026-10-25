#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Holland Board of Public Works (City of Holland, Michigan) tree layer
async function main() {
  const endpoint = 'https://services1.arcgis.com/QNHFBm4iXVHdb5Xv/arcgis/rest/services/Trees_public_ff9eaad404f64dceafb78f7aff40de10/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
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

  fs.writeFileSync(path.join(__dirname, 'hollandmi_mi_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to hollandmi_mi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
