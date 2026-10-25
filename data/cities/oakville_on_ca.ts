#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.oakville.ca/oakgis/rest/services/PGIS_BULK/Parks_Tree_Forestry/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "STATUS = 'EXISTING' AND SPECIES IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    name = a.SPECIES.split(' - ').slice(1).join(' - ').replace(/\s*'.*$/, '').trim();
    name = name.replace(/\s*[(‘’'"Γ,\n].*$/s, '').replace(/\s+[x×]$/, '').trim();
    if (!/^[A-Z][a-z]+( |$)/.test(name) || /^unknown/i.test(name) || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'oakville_on_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
