#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/2gQ2Dv4Fb016qFVU/arcgis/rest/services/Park_Tree_Inventory/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "TREE_ALIVE_DEAD LIKE 'Alive%' AND SPECIES IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    name = a.SPECIES.split(' - ')[0].trim();
    name = name.replace(/\s*[(‘’'"Γ,\n].*$/s, '').replace(/\s+[x×]$/, '').trim();
    if (!/^[A-Z][a-z]+( |$)/.test(name) || /^unknown/i.test(name) || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'medicinehat_ab_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
