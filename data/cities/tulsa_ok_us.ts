#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://utility.arcgis.com/usrsvcs/servers/7ef20f8a5add4adcb61b95fdf630984d/rest/services/FieldMaps/TreesFieldEdits/MapServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> 'Other' AND Genus <> 'Unknown' AND (Status IS NULL OR Status = 'Active')",
    returnGeometry: true
  });

  // genus alone when the species is unspecified
  let trees = rows.map(o => {
    let species = (o.attributes.Species ?? '').trim().toLowerCase();
    let generic = ['', 'other', 'unknown', 'spp', 'sp'].includes(species);
    return {
      name: generic ? o.attributes.Genus.trim() : `${o.attributes.Genus.trim()} ${species}`,
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'tulsa_ok_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
