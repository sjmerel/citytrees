#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://gisweb.charlottesville.org/cvgisweb/rest/services/OpenData_1/MapServer/79';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: `${o.attributes.Genus.trim()} ${(o.attributes.Species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'charlottesville_va_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
