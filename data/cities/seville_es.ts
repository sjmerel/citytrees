#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: { ESPECIE: string | null; TIPO_MARRA: string | null };
  geometry: { x: number; y: number } | null;
}

// Combine the separately licensed tree and palm inventories, not their duplicate combined service.
// The inventories describe 2024 surveys; publication in 2025 is not a newer survey.
export function treeSite(row: Tree) {
  if (row.attributes.TIPO_MARRA?.trim()) return;
  let name = row.attributes.ESPECIE?.replace(/\s+/g, ' ').trim();
  if (!name || /^(?:Especie sin determinar|Marra o alcorque vacio|Tocón Tocón)$/i.test(name)) return;
  if (/^(?:Bambusa|Bougainvillea|Musa|Nerium|Ravenala)\b/i.test(name) ||
      /^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(row.geometry);
  let { x: lon, y: lat } = row.geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 37.25 && lat < 37.55 && lon > -6.1 && lon < -5.8);
  return { lat, lon, name };
}

async function main() {
  let trees: { lat: number; lon: number; name: string }[] = [];
  let count = 0;
  for (let layer of ['Parques_y_Jardines_Inventario_de_Arboles/FeatureServer/13',
                     'Parques_y_Jardines_Inventario_de_Palmeras/FeatureServer/12']) {
    let rows: Tree[] = await CityUtil.fetchArcGis(
      `https://services1.arcgis.com/hcmP7kr0Cx3AcTJk/arcgis/rest/services/${layer}`,
      { fields: 'OBJECTID,ESPECIE,TIPO_MARRA',
        where: "TIPO_MARRA IS NULL OR TIPO_MARRA IN ('', ' ')",
        returnGeometry: true, verifyComplete: true });
    count += rows.length;
    for (let row of rows) {
      let tree = treeSite(row);
      if (tree) trees.push(tree);
    }
  }
  assert(trees.length > 150000, 'Unexpectedly few Seville trees');
  fs.writeFileSync(path.join(__dirname, 'seville_es.json'), JSON.stringify(trees));
  console.log(`seville_es: ${trees.length} trees; ${count - trees.length} candidate records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
