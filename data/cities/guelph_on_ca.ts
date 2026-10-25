#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Guelph street-tree ownership layer. This MapServer layer does not return
// geometry (always null) even when requested, but it does expose LAT/LONG attribute
// fields directly, along with a clean SPECIES_SCIENTIFIC field (upper case binomial).
async function main() {
  const endpoint = 'https://gismaps.guelph.ca/hosting/rest/services/Forestry/StreetTreeOwnership/MapServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES_SCIENTIFIC,LAT,LONG',
    where: "SPECIES_SCIENTIFIC IS NOT NULL AND SPECIES_SCIENTIFIC <> ''",
    returnGeometry: false
  });

  const trees = rows.flatMap((o: any) => {
    const raw = (o.attributes.SPECIES_SCIENTIFIC ?? '').trim();
    if (!raw) return [];
    const name = raw.toLowerCase().replace(/^([a-z])/, (m: string) => m.toUpperCase());
    const lat = o.attributes.LAT;
    const lon = o.attributes.LONG;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'guelph_on_ca.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to guelph_on_ca.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
