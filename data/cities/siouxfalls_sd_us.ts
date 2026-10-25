#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://gis.siouxfalls.gov/arcgis/rest/services/Data/Trees/MapServer/10';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SiteType,Genus,Species',
    where: "SiteType IN ('Tree', 'Treated', 'Memorial Tree', 'CommuniTree') AND Species IS NOT NULL AND Species <> ''",
    returnGeometry: true
  });

  // Species holds the binomial followed by a truncated cultivar; keep genus + species only
  let trees = rows.map(o => ({
    name: o.attributes.Species.replace(/'.*$/, '').trim().split(/\s+/).slice(0, 2).join(' '),
    lat: o.geometry.y,
    lon: o.geometry.x
  }))
    .filter(t => /^[A-Z][a-z]+( [A-Za-z-]+)?$/.test(t.name));

  fs.writeFileSync(path.join(__dirname, 'siouxfalls_sd_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
