#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/pNPbgWy7hpfFGWoZ/arcgis/rest/services/Trees/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND GENUS <> ' ' AND GENUS <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${o.attributes.GENUS.trim()} ${(o.attributes.SPECIES ?? '').trim()}`.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'lansing_mi_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
