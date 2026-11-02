#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/WK6JRyyNiFsxCE3s/arcgis/rest/services/Aurora_Trees_7_7_19_PUBLIC/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,LATIN',
    where: "LATIN IS NOT NULL",
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.LATIN.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/^(other|unknown)$/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'aurora_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
