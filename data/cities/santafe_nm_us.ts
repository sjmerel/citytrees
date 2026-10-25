#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/XQV8LA8nMUXfZshp/arcgis/rest/services/2026_City_Managed_Santa_Fe_Public_Spaces_Tree_Inventory_WFL1/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'LatinName',
    where: "LatinName IS NOT NULL AND LatinName <> ' ' AND LatinName <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.LatinName.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => !/^(broadleaf|conifer|unknown)/i.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'santafe_nm_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
