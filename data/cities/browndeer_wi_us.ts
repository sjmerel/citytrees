#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Non-tree placeholder rows (e.g. "No Plant Site") are excluded.
const skip = /no plant site|vacant|stump/i;

async function main() {
  const endpoint = 'https://services7.arcgis.com/67OiksmEKqKrWD25/arcgis/rest/services/Trees_public_view/FeatureServer/0';
  const rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const genus = String(row.attributes.Genus ?? '').trim();
    const species = String(row.attributes.Species ?? '').trim();
    const name = species ? `${genus} ${species}` : genus;
    if (!row.geometry || !genus || skip.test(name)) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'browndeer_wi_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to browndeer_wi_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
