#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/s1wgJQKbKJihhhaT/arcgis/rest/services/Trees_Public_view/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Name',
    where: "Name IS NOT NULL AND Name <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Name.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/^(other|oak)$/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'milwaukeecounty_wi_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
