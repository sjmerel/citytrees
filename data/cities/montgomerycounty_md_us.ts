#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://montgomeryplans.org/server/rest/services/Arboriculture/TreeInventory_Pt/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP_BOT',
    where: "SPP_BOT IS NOT NULL AND SPP_BOT NOT IN ('Vacant site', 'Stump', '_Work', 'N/A') AND SPP_BOT NOT LIKE '%acant%' AND SPP_BOT LIKE '____%'",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP_BOT.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'montgomerycounty_md_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
