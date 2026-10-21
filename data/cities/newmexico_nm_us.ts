#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Statewide NM Tree Plotter inventory (2019); Santa Fe is excluded because it is
// already covered by its own santafe_nm_us script using a different source.
async function main() {
  let endpoint = 'https://services.arcgis.com/LGtNQDlIZBdntoA9/arcgis/rest/services/NM_PublicTree_Map/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'CITY,SPECIES_LA',
    where: "SPECIES_LA IS NOT NULL AND SPECIES_LA <> '' AND SPECIES_LA <> 'N/A' AND CITY <> 'Santa Fe'",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.SPECIES_LA.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'newmexico_nm_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
