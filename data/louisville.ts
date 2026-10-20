#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/79kfd2K6fskCAkyg/ArcGIS/rest/services/URBAN_FORESTRY_TREES_(PUBLIC_DATA_VIEW)/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Tree_Name_Genus_Species',
    where: "Status IN ('StreetTree', 'ParkTree') AND Tree_Name_Genus_Species IS NOT NULL AND Tree_Name_Genus_Species <> '' AND Tree_Name_Genus_Species NOT LIKE '%unknown%'",
    returnGeometry: true
  });

  // values look like "Redbud, Eastern - Cercis canadensis"
  let trees = rows.map(o => {
    let value = o.attributes.Tree_Name_Genus_Species;
    return {
      name: value.substring(value.lastIndexOf(' - ') + 3).trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync('louisville.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
