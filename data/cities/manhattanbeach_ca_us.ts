#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/0j6vZbECadDEXdAS/arcgis/rest/services/Manhattan_Beach_Trimmed/FeatureServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'FID,SpeciesBot',
    where: "SpeciesBot IS NOT NULL AND SpeciesBot <> ''",
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SpeciesBot.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/stump|vacant|unknown/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'manhattanbeach_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
