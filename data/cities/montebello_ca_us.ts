#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services2.arcgis.com/yrktbS5Xw87hJQvs/arcgis/rest/services/CityOfMontebello_iTree_CanopyCover/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'Species_Name',
      where: "Species_Name IS NOT NULL AND Species_Name <> '' AND Species_Name NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 30 && o.geometry.x < -100)
    .map(o => ({
      lat: o.geometry.y,
      lon: o.geometry.x,
      name: o.attributes.Species_Name.trim()
    }));

  fs.writeFileSync(path.join(__dirname, 'montebello_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
