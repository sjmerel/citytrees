#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/NqY8dnPSEdMJhuRw/arcgis/rest/services/Park_Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus_txt,SpecificEpithet',
    where: "Genus_txt IS NOT NULL AND Genus_txt <> '' AND Genus_txt <> ' '",
    returnGeometry: true
  });

  // epithet may carry a quoted cultivar; "spp." means genus only
  let trees = rows.filter(o => o.geometry).map(o => {
    let epithet = (o.attributes.SpecificEpithet ?? '').replace(/'.*$/, '').trim();
    if (/^(sp|spp|species)\.?$/i.test(epithet)) epithet = '';
    return {
      name: `${o.attributes.Genus_txt.trim()} ${epithet}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'dublin_oh_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
