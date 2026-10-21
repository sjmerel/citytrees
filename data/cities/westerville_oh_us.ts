#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Westerville public tree layer; excludes blank/'Unknown' scientific names (mostly plantable/vacant sites).
async function main() {
  const endpoint = 'https://services.arcgis.com/OrM4sGBhxpl5PoQe/arcgis/rest/services/Westerville_Trees_(Public)/FeatureServer/1';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'tree_scientific_name',
    where: "tree_scientific_name IS NOT NULL AND tree_scientific_name <> '' AND tree_scientific_name <> 'Unknown'",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.tree_scientific_name ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'westerville_oh_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to westerville_oh_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
