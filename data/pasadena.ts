#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://services2.arcgis.com/zNjnZafDYCAJAbN0/arcgis/rest/services/Street_ROW_Trees/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'Genus,Species',
      where: "Genus <> '' AND Species <> ''",
      returnGeometry: true
    }
  );

  let trees = rows.map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x, 
    name: `${o.attributes.Genus} ${o.attributes.Species}`.trim()
  }));

  fs.writeFileSync('pasadena.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
