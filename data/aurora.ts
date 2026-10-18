#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/0Va1ID99NSrNyyPX/arcgis/rest/services/Trees_public_d2e03763c35b47d1875d2b413c76fbda/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "spacestatus = 'Planted' AND genus IS NOT NULL AND species IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${o.attributes.genus.trim()} ${o.attributes.species.trim().toLowerCase()}`,
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('aurora.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();
