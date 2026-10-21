#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Entries that are not a single identified species
const skip = /^mixed |hedgerow|shrubbery/i;

async function main() {
  const endpoint = 'https://services1.arcgis.com/PxbTDTskGHCe4sv6/arcgis/rest/services/Tree_Data_Survey_Oct_2022_SDCC/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species',
    where: "Species IS NOT NULL AND Species <> ''",
    returnGeometry: true
  });

  const trees = rows
    .filter((row: any) => row.geometry && row.attributes.Species?.trim() && !skip.test(row.attributes.Species))
    .map((row: any) => ({
      name: row.attributes.Species.trim(),
      lat: row.geometry.y,
      lon: row.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'southdublin_ie.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to southdublin_ie.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
