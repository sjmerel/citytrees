#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';
import { CityUtil } from './city_util';

// Official 2017–2018 public street-tree census, licensed CC BY 2.5 AR. Attribution is required.
// https://data.buenosaires.gob.ar/dataset/arbolado-publico-lineal
async function main() {
  let endpoint = 'https://cdn.buenosaires.gob.ar/datosabiertos/datasets/atencion-ciudadana/arbolado-publico-lineal/arbolado-publico-lineal-2017-2018.csv';
  let response = await CityUtil.getWithRetry(endpoint, {
    responseType: 'stream', timeout: 300000
  });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];
  let rowCount = 0;

  for await (let row of parser) {
    rowCount++;
    assert(row.nro_registro && typeof row.nombre_cientifico === 'string');
    let category = row.tipo_activ.trim().toLowerCase();
    assert(category === 'lineal' || category === 'calle');
    assert(typeof row.estado_plantera === 'string');
    let planterState = row.estado_plantera.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    if (planterState === 'vacia') continue;
    let sourceName = row.nombre_cientifico.trim();
    if (!sourceName || /^(?:no identificado|arbusto|cactus)$/i.test(sourceName)) continue;

    let name = sourceName.replace(/\s+sp{1,2}\.\s*$/i, '').trim();
    assert(name.length > 0);
    if (!row.lat.trim() || !row.long.trim()) continue;
    let lat = Number(row.lat);
    let lon = Number(row.long);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    assert(lat > -34.75 && lat < -34.50 && lon > -58.60 && lon < -58.25,
      `Out-of-area Buenos Aires tree: ${lat}, ${lon}`);
    trees.push({ name, lat, lon });
  }

  assert.equal(rowCount, 370180, 'Unexpectedly incomplete or changed Buenos Aires export');
  assert(trees.length > 300000, `Unexpectedly few valid Buenos Aires trees: ${trees.length}`);
  fs.writeFileSync(path.join(__dirname, 'buenosaires_ar.json'), JSON.stringify(trees, null, 2));
  console.log(`buenosaires_ar: ${trees.length} trees from ${rowCount} records`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
