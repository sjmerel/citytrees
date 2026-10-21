#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://gis.wcc.govt.nz/arcgis/rest/services/Parks/Parks/MapServer/53';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'botanical_name',
    where: "botanical_name IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.botanical_name.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'wellington_nz.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
