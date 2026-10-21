#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://ags3.scgov.net/server/rest/services/Hosted/TreeInventory/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genusname',
    where: "genusname IS NOT NULL AND genusname <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.genusname.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'sarasotacounty_fl_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
