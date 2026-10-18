#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/Oknk0tvfHOElpgGU/arcgis/rest/services/Brookline_Tree_Viewer_Web_WFL1/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'ScientificName',
    where: "ScientificName IS NOT NULL AND ScientificName <> '' AND (IsStump IS NULL OR IsStump = 0)",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.ScientificName.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync('brookline.json', JSON.stringify(trees, null, 2));
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
