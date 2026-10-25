#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/qAo1OsXi67t7XgmS/arcgis/rest/services/Tree_Inventory/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_LATIN',
    where: "STATUS = 'ACTIVE' AND SPECIES_LATIN IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    name = a.SPECIES_LATIN.replace(/\s*'.*$/, '').trim();
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'kitchener_on_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
