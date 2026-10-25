#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Hastings District Council (Hawke's Bay, New Zealand) tree layer; tree_species holds the botanical name.
async function main() {
  const endpoint = 'https://services1.arcgis.com/8L3DQUzjrkgEmDpQ/arcgis/rest/services/Hastings_DC_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'tree_species',
    where: "tree_species IS NOT NULL AND tree_species <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const name = (o.attributes.tree_species ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'hastingsdc_nz.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to hastingsdc_nz.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
