#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface Tree {
  obj_id: number;
  genere?: string;
  specie?: string;
  varieta?: string;
  LONG_X_4326: number | null;
  LAT_Y_4326: number | null;
}

// Comune di Milano, municipal managed trees, March 31, 2025 snapshot, CC BY.
// https://dati.comune.milano.it/dataset/ds2484_infogeo_alberi_localizzazione
// No health/removal field. data_ini is a record start date, not a survey date.
// JSON coordinates are explicitly EPSG:4326. Uses the system unzip utility.
// codice is an asset class, not a unique tree ID; obj_id is unique.
async function main() {
  let response = await axios.get(
    'https://dati.comune.milano.it/dataset/609a5892-f5fa-4fa3-98e3-eab9ebeba5b8/resource/66d2764e-9100-4eef-925d-aa86406e5ec5/download/ds2484_alberi_20250331_json.zip',
    { responseType: 'arraybuffer', timeout: 120000 });
  let directory = fs.mkdtempSync(path.join(os.tmpdir(), 'milan-trees-'));
  let archive = path.join(directory, 'trees.zip');
  let rows: Tree[];
  try {
    fs.writeFileSync(archive, response.data);
    let json = execFileSync('unzip', ['-p', archive, 'ds2484_alberi_20250331.json'], {
      encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000
    });
    rows = JSON.parse(json);
    assert(Array.isArray(rows) && rows.length > 0);
  } finally {
    if (fs.existsSync(archive)) fs.unlinkSync(archive);
    fs.rmdirSync(directory);
  }
  let ids = new Set<number>();
  let trees = [];
  for (let row of rows) {
    assert(Number.isInteger(row.obj_id) && !ids.has(row.obj_id), 'Repeated Milan tree ID');
    ids.add(row.obj_id);
    assert(row.genere === undefined || typeof row.genere === 'string');
    assert(row.specie === undefined || typeof row.specie === 'string');
    assert(row.varieta === undefined || typeof row.varieta === 'string');
    let genus = row.genere?.trim();
    if (!genus || /^(?:Musa|Mimosa)$/.test(genus)) continue;
    let name = [genus, row.specie?.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ');
    if (/^(?:Cornus sanguinea|Clerodendron bungei|Prunus glandulosa)$/.test(name)) continue;
    // Separate cultivar labels sometimes contain nested quotes in the source.
    let cultivar = row.varieta?.replace(/["']/g, '').trim();
    if (cultivar) name += ` '${cultivar}'`;
    if (row.LAT_Y_4326 === null || row.LONG_X_4326 === null) continue;
    let lat = row.LAT_Y_4326, lon = row.LONG_X_4326;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 45.35 && lat < 45.6 && lon > 9 && lon < 9.35);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'milan_it.json'), JSON.stringify(trees, null, 2));
  console.log(`milan_it: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
