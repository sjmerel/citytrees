#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// SPECIES holds a single-word epithet for most rows (e.g. "macrocarpa" or "Triacanthos") but many
// rows hold a common name instead (e.g. "Colorado Spruce", "Crab Apple Spp."); only single-word,
// non-blacklisted rows are kept.
const epithet = /^[A-Za-z][A-Za-z]*$/;
const notASpecies = /^(unknown|sycamore|willow|ulmus|x)$/i;

async function main() {
  const endpoint = 'https://services7.arcgis.com/Z2kjnwbHdLo56fuu/arcgis/rest/services/Trees/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,SPECIES',
    where: "Genus IS NOT NULL AND SPECIES IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const genus = String(row.attributes.Genus ?? '').trim();
    const species = String(row.attributes.SPECIES ?? '').trim();
    if (!row.geometry || !genus || !epithet.test(species) || notASpecies.test(species)) return [];
    return [{ name: `${genus} ${species}`, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'oconomowoc_wi_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to oconomowoc_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
