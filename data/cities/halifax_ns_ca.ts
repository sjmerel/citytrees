#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/11XBiaBYA9Ep0yNJ/arcgis/rest/services/Public_Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SP_SCIEN',
    where: "SP_SCIEN IS NOT NULL AND ASSETSTAT = 'INS'",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    name = a.SP_SCIEN.replace(/\s*\(genus\)/i, '').trim();
    name = name.replace(/\s*[(‘’'"Γ,\n].*$/s, '').replace(/\s+[x×]$/, '').trim();
    name = name.toLowerCase().replace(/^./, c => c.toUpperCase());
    if (!/^[A-Z][a-z]+( |$)/.test(name) || /^unknown/i.test(name) || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'halifax_ns_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
