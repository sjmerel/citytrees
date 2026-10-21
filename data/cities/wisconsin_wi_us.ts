#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Wisconsin DNR Community Trees layer: municipal inventories compiled by the DNR, all communities.
async function main() {
  let endpoint = 'https://services5.arcgis.com/Ul9AyFFeFTjf08DW/arcgis/rest/services/WI_Municipal_Trees_10_8_24/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Latin_Name',
    where: "Latin_Name IS NOT NULL AND Latin_Name <> '' AND Latin_Name <> 'N/A'",
    returnGeometry: true
  });

  let trees = rows.filter(o => o.geometry).map(o => ({
    name: o.attributes.Latin_Name.trim().replace('Ã—', 'x').replace('×', 'x').replace(/\s+(spp\.?|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => t.name);

  // compact JSON, since the file is large
  fs.writeFileSync(path.join(__dirname, 'wisconsin_wi_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
