#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/1qjjJoUN1p26Md36/arcgis/rest/services/Council_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "LatinName IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let raw = (o.attributes.LatinName ?? '').trim();
    let name = raw.replace(/\s*['"‘’].*$/, '').replace(/\s+/g, ' ').trim();
    if (!/^[A-Z][a-z]+( (x |× )?[a-z-]+\.?)?$/i.test(name) || /^(Other|Various|Unknown|Unclassified|Cherry|Mixed|Hedge)\b/i.test(name) || !o.geometry) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'edinburgh_gb.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
