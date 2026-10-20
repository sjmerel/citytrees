#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services8.arcgis.com/01oq2N3cUfdKDUBU/arcgis/rest/services/GLUF_Michigan_City_Trees_for_Public_View_8_19_25/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "TREE_STATUS IN ('ACTIVE TREE', 'PRIORITY REMOVAL-VISITED') AND LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  let trees = rows.filter(o => o.geometry).map(o => ({
    name: o.attributes.LATIN_NAME.trim().replace(/\s+(spp\.?|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => t.name);

  fs.writeFileSync(path.join(__dirname, 'michigancity_in_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
