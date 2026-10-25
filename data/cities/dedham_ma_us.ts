#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/me41C4ZTLmDO2rPK/arcgis/rest/services/production_DBO_Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Species_bot',
    where: "Species_bot IS NOT NULL AND Species_bot <> '' AND UPPER(Species_bot) <> 'STUMP' AND DateRemoved IS NULL",
    returnGeometry: true
  });

  const trees = rows.map(o => ({
    name: o.attributes.Species_bot.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'dedham_ma_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
