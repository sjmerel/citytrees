#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services7.arcgis.com/iZIPdzAfqdnP9vrA/arcgis/rest/services/Tree_Inventory_(Public)/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,SPECIES',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/^(n\/a|unknown)/i.test(o.attributes.Genus.trim()))
    .map(o => ({
      name: `${o.attributes.Genus.trim()} ${(o.attributes.SPECIES ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'stoughton_wi_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
