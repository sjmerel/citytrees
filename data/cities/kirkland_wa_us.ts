#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City of Kirkland public tree layer; GENUS is the full genus name, SPECIES_BOTANICAL
// is an abbreviated binomial like "A. platanoides" (genus abbreviated, epithet full).
// Combine the full genus with the epithet extracted from SPECIES_BOTANICAL.
async function main() {
  const endpoint = 'https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Trees_-_Public_View/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES_BOTANICAL',
    where: "GENUS IS NOT NULL AND GENUS <> ''",
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const genusRaw = (o.attributes.GENUS ?? '').trim();
    if (!genusRaw) return [];
    const genus = genusRaw.charAt(0).toUpperCase() + genusRaw.slice(1).toLowerCase();
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

    const botanical = (o.attributes.SPECIES_BOTANICAL ?? '').trim();
    // Strip a leading abbreviated-genus token like "A." or "A. x" before the epithet.
    const epithet = botanical.replace(/^[A-Za-z]+\.\s*/, '').trim();

    return [{
      name: epithet ? `${genus} ${epithet}` : genus,
      lat,
      lon
    }];
  });

  fs.writeFileSync(path.join(__dirname, 'kirkland_wa_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to kirkland_wa_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
