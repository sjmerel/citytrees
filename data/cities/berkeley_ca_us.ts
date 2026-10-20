#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/IYiCpZoSIq9lAxi8/arcgis/rest/services/Trees_Test/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES,Latitude,Longitude',
    where: "SPECIES IS NOT NULL AND SPECIES <> 'Planting Site' AND Latitude IS NOT NULL AND Longitude IS NOT NULL"
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES.trim(),
    lat: parseFloat(o.attributes.Latitude),
    lon: parseFloat(o.attributes.Longitude)
  }));

  fs.writeFileSync(path.join(__dirname, 'berkeley_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
