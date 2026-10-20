#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/ATdLnvuMRJk8AGkQ/arcgis/rest/services/Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "LATIN_NAME IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    let words = a.LATIN_NAME.trim().toLowerCase().split(/\s+/);
    let n = words[1] === 'x' ? 3 : 2;
    name = words.slice(0, n).join(' ').replace(/^./, c => c.toUpperCase());
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'whitby_on_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
