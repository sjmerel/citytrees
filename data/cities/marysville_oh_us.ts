#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services3.arcgis.com/ccRMrVzOSHBUG6X2/arcgis/rest/services/Tree_Sites_Public/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'latin_genus,latin_specific_epithet',
    where: "status = 'active' AND latin_genus IS NOT NULL AND latin_genus <> '' AND latin_genus <> 'Vacant'",
    returnGeometry: true
  });

  // epithet "sp" means genus only; keep hybrid markers like "x freemanii"
  let trees = rows.map(o => {
    let epithet = (o.attributes.latin_specific_epithet ?? '').trim();
    if (/^(sp|spp|species)\.?$/i.test(epithet)) epithet = '';
    return {
      name: `${o.attributes.latin_genus.trim()} ${epithet}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'marysville_oh_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
