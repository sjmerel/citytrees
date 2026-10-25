#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/oYaMaMY9WlGtyT0U/arcgis/rest/services/Street_Trees_View/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Botanical_Name',
    where: "Botanical_Name IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Botanical_Name.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'gaithersburg_md_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
