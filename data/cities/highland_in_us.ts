#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/O84xnDYzd5SLF06r/arcgis/rest/services/Highland_Trees_Public_3_23_26/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'LATIN_NAME',
    where: "TREE_STATUS = 'ACTIVE TREE' AND LATIN_NAME IS NOT NULL AND LATIN_NAME <> ''",
    returnGeometry: true
  });

  let trees = rows.filter(o => o.geometry).map(o => ({
    name: o.attributes.LATIN_NAME.trim().replace(/\s+(spp\.?|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'highland_in_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
