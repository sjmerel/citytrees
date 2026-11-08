#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  num_arbre: string;
  si_essence: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Ville et Eurometropole de Strasbourg, Patrimoine arbore; Licence Ouverte 2.0.
// https://data.strasbourg.eu/explore/dataset/patrimoine_arbore/
// Individually managed metropolitan street/equipment trees and Strasbourg
// municipal parks/schools, not woods, private trees or other communes' parks.
// Monthly export processed 2026-11-01, not a per-tree inspection date; the
// publisher warns about delays. No separate removal/health status is exposed.
// Drop unknowns/shrubs; omit cultivars, preserve botanical spelling, normalize
// source suffix hybrids ("Alnus spaethii x") to "Alnus x spaethii".
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/patrimoine_arbore');
  let ids = new Set<string>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    assert(typeof row.num_arbre === 'string' && /^\d+$/.test(row.num_arbre) && !ids.has(row.num_arbre),
      'Invalid/repeated Strasbourg tree ID');
    ids.add(row.num_arbre);
    assert(row.si_essence === null || typeof row.si_essence === 'string');
    let label = row.si_essence?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!label || label === 'Essence non definie') continue;
    assert(/^[A-Z][a-z]+(?:\s|$)/.test(label), `Unexpected Strasbourg botanical name: ${label}`);
    let parts = label.split(' ');
    let genus = parts[0];
    if (/^(?:Cephalotaxus|Euonymus|Hippophae|Sambuscus)$/.test(genus)) continue;
    let hybrid = parts[1] === 'x' || parts[2] === 'x';
    let species = parts[parts[1] === 'x' ? 2 : 1] ?? '';
    if (!/^[a-z][a-z-]+$/.test(species) || label === 'Quercus variabilis x Acutissima' ||
      (genus === 'Malus' && species === 'evereste')) {
      species = '';
    }
    let name = [genus, species ? `${hybrid ? 'x ' : ''}${species}` : ''].filter(Boolean).join(' ');
    if (/^(?:Pinus mugo|Prunus (?:fruticosa|glandulosa|laurocerasus))$/.test(name)) continue;
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 48.43 && lat < 48.78 && lon > 7.52 && lon < 7.86);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'strasbourg_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`strasbourg_fr: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
