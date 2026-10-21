#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { DataUtil } from '../data_util';

// Combines the current (cwams) and legacy tree layers; both use the same coded TreeSpecies domain
// ("Scientific name" per the domain description).
const endpoints = [
  'https://gis.burienwa.gov/server/rest/services/cwams/cwams_Trees/MapServer/0',
  'https://services6.arcgis.com/pZ4CUxkTrr0NFJXS/arcgis/rest/services/Trees/FeatureServer/8'
];

async function fetchCity(endpoint: string) {
  const metadata = (await axios.get(endpoint, { params: { f: 'json' } })).data;
  const speciesField = metadata.fields?.find((field: any) => field.name === 'TreeSpecies');
  const codedValues = speciesField?.domain?.codedValues;
  if (!Array.isArray(codedValues)) throw new Error(`TreeSpecies code lookup is unavailable for ${endpoint}`);
  const names = new Map(codedValues.map((item: any) => [String(item.code), String(item.name).trim()]));

  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'TreeSpecies',
    where: "TreeSpecies IS NOT NULL",
    returnGeometry: true
  });

  return rows.flatMap((row: any) => {
    const name = names.get(String(row.attributes.TreeSpecies));
    if (!name || !row.geometry) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });
}

async function main() {
  const trees = (await Promise.all(endpoints.map(fetchCity))).flat();

  fs.writeFileSync(path.join(__dirname, 'burien_wa_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to burien_wa_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
