#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of St. Louis Park tree layer
async function main() {
  const endpoint = 'https://utility.arcgis.com/usrsvcs/servers/d8e68ae495d24f06a9adc233bf6e4c55/rest/services/AGO/Parks/MapServer/1';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genus = (o.attributes.GENUS ?? '').trim();
    if (!genus) return [];
    const species = (o.attributes.SPECIES ?? '').trim();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{
      name: species ? `${genus} ${species}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'stlouispark_mn_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to stlouispark_mn_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
