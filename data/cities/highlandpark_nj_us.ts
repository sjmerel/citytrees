#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/ze0XBzU1FXj94DJq/arcgis/rest/services/HPSTI_2022_AllSticks_ForWeb/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LatinGenus,LatinSpeci',
    where: "Status22 NOT IN ('Dead', 'Trunk') AND LatinGenus IS NOT NULL AND LatinGenus <> '' AND UPPER(LatinGenus) <> 'DEAD'",
    returnGeometry: true
  });

  const trees = rows.map(o => {
    const genus = (o.attributes.LatinGenus ?? '').trim();
    const species = (o.attributes.LatinSpeci ?? '').trim();
    return {
      name: species ? `${genus} ${species}` : genus,
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'highlandpark_nj_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
