#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';

// Ayuntamiento de Madrid, July 7, 2026 export, CC BY 4.0.
// https://datos.madrid.es/dataset/300761-0-arbolado-especies/information
// Municipal streets/parks, excluding forest stands, nurseries and some operators.
// The current CSV has no condition/removal field or individual inspection dates.
// Prefer its 799,110 source records over the smaller companion shapefile.
// Official field documentation specifies ETRS89 / UTM 30N (EPSG:25830);
// transformed coordinates also agree with the accompanying WGS84 shapefile.
const ETRS89_UTM30 = '+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs';
const nonTreeGenera = new Set([
  'ALYSSUM', 'CONVOLVULUS', 'COREOPSIS', 'ENSETE', 'HEDERA', 'LAMPRANTHUS',
  'MALVA', 'MENTHA', 'MUSA', 'PASSIFLORA', 'PELLAEA', 'PETUNIA', 'PHLOMIS',
  'PHORMIUM', 'PHYSOSTEGIA', 'PLANTAGO', 'PYRETHRUM', 'SEDUM', 'VITIS', 'WISTERIA'
]);

async function main() {
  let response = await axios.get(
    'https://datos.madrid.es/dataset/300761-0-arbolado-especies/resource/300761-8-arbolado-especies/download/300761-8-arbolado-especies.csv',
    { responseType: 'stream', timeout: 120000 });
  let parser = response.data.pipe(parse({
    columns: true, delimiter: ';', bom: true, skip_empty_lines: true
  }));
  response.data.on('error', (error: Error) => parser.destroy(error));
  let trees = [];
  let ids = new Set<string>();
  let excluded = 0;
  for await (let row of parser) {
    assert(typeof row.ASSETNUM === 'string' && /^\d+$/.test(row.ASSETNUM));
    assert(!ids.has(row.ASSETNUM), 'Repeated Madrid tree ID');
    ids.add(row.ASSETNUM);
    assert(typeof row.ESPECIE === 'string' && typeof row.X === 'string' && typeof row.Y === 'string');
    let name = row.ESPECIE.replace(/\s+/g, ' ').trim();
    let genus = name.split(' ')[0].toUpperCase();
    if (!name || /^SIN ESPECIE$/i.test(name) || nonTreeGenera.has(genus)) {
      ++excluded;
      continue;
    }
    if (!row.X.trim() || !row.Y.trim()) {
      ++excluded;
      continue;
    }
    let x = Number(row.X), y = Number(row.Y);
    assert(Number.isFinite(x) && Number.isFinite(y));
    let [lon, lat] = proj4(ETRS89_UTM30, 'WGS84', [x, y]);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 40.2 && lat < 40.7 && lon > -3.95 && lon < -3.3, 'Madrid coordinate outside inventory area');
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'madrid_es.json'), JSON.stringify(trees, null, 2));
  console.log(`madrid_es: ${trees.length} trees; ${excluded} unidentified/non-tree/unlocated sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
