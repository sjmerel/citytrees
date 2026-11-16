#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: { nom_botanico: string | null; estado_gral: string | null; grupo: string | null };
  geometry: { x: number; y: number } | null;
}

export function treeSite(row: Tree) {
  let p = row.attributes;
  if (/^(?:Falta|Seco|Tocón)$/i.test(p.estado_gral?.trim() ?? '')) return;
  if (/^Arbusto\b/i.test(p.grupo?.trim() ?? '')) return;
  let name = p.nom_botanico?.replace(/\s+/g, ' ').trim().replace(/\s+(?:macho|hembra)$/i, '');
  if (!name || /^Especie sin determinar$/i.test(name)) return;
  if (/^(?:Bambusa|Bougainvillea|Musa|Nerium|Ravenala)\b/i.test(name) ||
      /^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(row.geometry);
  let { x: lon, y: lat } = row.geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 39.25 && lat < 39.6 && lon > -0.55 && lon < -0.25);
  return { lat, lon, name };
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://geoportal.valencia.es/server/rest/services/OPENDATA/MedioAmbiente/MapServer/151',
    { fields: 'objectid,nom_botanico,estado_gral,grupo', where: 'nom_botanico IS NOT NULL',
      returnGeometry: true, verifyComplete: true });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row);
    return tree ? [tree] : [];
  });
  assert(trees.length > 100000, 'Unexpectedly few Valencia trees');
  fs.writeFileSync(path.join(__dirname, 'valencia_es.json'), JSON.stringify(trees));
  console.log(`valencia_es: ${trees.length} trees; ${rows.length - trees.length} records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
