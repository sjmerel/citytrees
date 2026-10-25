#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/Trees_Atlanta_Plant_Inventory_Public_View/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "City = 'Atlanta' AND Genus IS NOT NULL AND SHAPE IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => {
    let genus = o.attributes.Genus.trim();
    let species = o.attributes.Species?.trim();
    let name = species && species.toUpperCase() !== 'NONE'
      ? `${genus} ${species}`
      : genus;
    return { name, lat: o.geometry.y, lon: o.geometry.x };
  });

  fs.writeFileSync(path.join(__dirname, 'atlanta_ga_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
