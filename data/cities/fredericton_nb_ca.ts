#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/iLWAxhpxafhOza2U/arcgis/rest/services/Tree_Inventory/FeatureServer/37';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus_Spec',
    where: "Genus_Spec IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    let words = a.Genus_Spec.trim().toLowerCase().split(/\s+/);
    let n = words[1] === 'x' ? 3 : 2;
    name = words.slice(0, n).join(' ').replace(/^./, c => c.toUpperCase());
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'fredericton_nb_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
