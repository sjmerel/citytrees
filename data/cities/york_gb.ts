#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.york.gov.uk/arcgis/rest/services/Public/EnvPlan/MapServer/3';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'BOTANICAL',
    where: "BOTANICAL IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let raw = (o.attributes.BOTANICAL ?? '').trim();
    let name = raw.replace(/\s*['"‘’].*$/, '').replace(/\s+/g, ' ').trim();
    if (!/^[A-Z][a-z]+( (x |× )?[a-z-]+\.?)?$/i.test(name) || /^(Other|Various|Unknown|Unclassified|Cherry|Mixed|Hedge)\b/i.test(name) || !o.geometry) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'york_gb.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
