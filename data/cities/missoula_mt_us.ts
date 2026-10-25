#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services.arcgis.com/HfwHS0BxZBQ1E5DY/arcgis/rest/services/TreeLocations_mso/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'species_botanical',
    where: "site_type = 'Tree' AND species_botanical IS NOT NULL AND species_botanical <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.species_botanical.trim().toLowerCase().replace(/^./, (c: string) => c.toUpperCase()),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/^(unknown|shrub|saccharum|maacki|sapporo)$/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'missoula_mt_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
