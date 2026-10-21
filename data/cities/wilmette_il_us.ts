#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  // Wilmette Park District inventory; this covers park trees, not the full municipality.
  let endpoint = 'https://services3.arcgis.com/pDU8KsdKcu20KqRi/arcgis/rest/services/Public_Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL,TREE_STATUS',
    where: "TREE_STATUS = 'ACTIVE TREE' AND BOTANICAL IS NOT NULL AND BOTANICAL <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.BOTANICAL.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'wilmette_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
