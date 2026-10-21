#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services8.arcgis.com/CkRzPR57msMC2M1b/arcgis/rest/services/Environmental_Public_View/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "Active = '1' AND SPP IS NOT NULL AND SPP <> '' AND SPP <> ' '",
    returnGeometry: true
  });

  let trees = rows.filter(o => o.geometry).map(o => ({
    name: o.attributes.SPP.trim().replace(/\s+(spp\.?|sp\.?)$/i, ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => /^[A-Z]/.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'southelgin_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
