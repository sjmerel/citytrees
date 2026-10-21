#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://maps.cor.gov/arcgis/rest/services/OpenData/Trees/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES,REMOVE',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${o.attributes.GENUS.trim()} ${(o.attributes.SPECIES ?? '').trim()}`.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'richardson_tx_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
