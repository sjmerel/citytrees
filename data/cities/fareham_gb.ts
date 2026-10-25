#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://maps.fareham.gov.uk/server/rest/services/Corporate/Trees/MapServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL",
    returnGeometry: true
  });

  // the server's firewall rejects a where clause with a string comparison, so empty names are dropped here
  let trees = rows.filter(o => o.attributes.SPECIES.trim() !== '').map(o => ({
    name: o.attributes.SPECIES.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'fareham_gb.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
