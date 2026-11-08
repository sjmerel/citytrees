#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { CityUtil } from './city_util';

interface Tree {
  type: string;
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: { id_arbre: string; nom_latin: string };
}

interface CsvTree {
  id_arbre: string;
  nom_latin: string;
}

// Ville de Montpellier / Montpellier Méditerranée Métropole:
// https://data.montpellier3m.fr/dataset/arbres-de-montpellier
// ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
// Attribution/license notices alone do not satisfy derivative-database
// share-alike and the machine-readable database/complete alterations offer.
// Real public tree inventory: 2025 roadside and 2026 municipal sites, surveyed
// by mobile mapping/imaging with automated processing, not modeled canopy.
// No taxonomic confidence or individual inspection/removal fields are exposed.
// Full labels include shrubs, vines, succulents and even Helianthus annuus:
// exclude non-trees; remaining labels are source identifications, not independently
// verified determinations. Rare exotics warrant publisher quality follow-up.
// Catalog refresh does not establish a new survey. CSV has no coordinates;
// use it only to cross-check every GeoJSON ID/name and the complete row count.
async function main() {
  let base = 'https://data.montpellier3m.fr/sites/default/files/ressources/MMM_MTP_Arbres';
  let response = await CityUtil.getWithRetry(`${base}.json`, { timeout: 240000 });
  let data: { type: string; features: Tree[] } = response.data;
  assert.equal(data.type, 'FeatureCollection');
  assert(Array.isArray(data.features) && data.features.length > 0);
  let csvResponse = await CityUtil.getWithRetry(`${base}.csv`, {
    responseType: 'text', timeout: 240000
  });
  let csv: CsvTree[] = parse(csvResponse.data, { columns: true, bom: true, skip_empty_lines: true });
  assert.equal(csv.length, data.features.length, 'Incomplete/mismatched Montpellier exports');
  let csvNames = new Map<string, string>();
  for (let row of csv) {
    assert(typeof row.id_arbre === 'string' && row.id_arbre.trim() !== '');
    assert(!csvNames.has(row.id_arbre), 'Repeated Montpellier CSV ID');
    assert(typeof row.nom_latin === 'string');
    csvNames.set(row.id_arbre, row.nom_latin.trim());
  }
  let nonTrees = new Set([
    'Actinidia', 'Agave', 'Bougainvillea', 'Buddleja', 'Campsis', 'Dasylirion',
    'Erythrostemon', 'Euonymus', 'Helianthus', 'Hibiscus', 'Lycianthes', 'Myrtus',
    'Nerium', 'Phyllostachys', 'Rosa', 'Spartium', 'Syringa', 'Tetrapanax',
    'Viburnum', 'Vitis'
  ]);
  let shrubSpecies = new Set([
    'Cornus sanguinea', 'Ligustrum vulgare', 'Photinia × fraseri',
    'Pistacia lentiscus', 'Pittosporum tobira', 'Prunus fruticosa',
    'Robinia hispida', 'Salix purpurea', 'Yucca aloifolia', 'Yucca rostrata'
  ]);
  let ids = new Set<string>();
  let omitted = { unknown: 0, shrubOrNonTree: 0, noPoint: 0 };
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of data.features) {
    assert.equal(row.type, 'Feature');
    let a = row.properties;
    assert(typeof a.id_arbre === 'string' && a.id_arbre.trim() !== '' && !ids.has(a.id_arbre));
    ids.add(a.id_arbre);
    assert(typeof a.nom_latin === 'string');
    let name = a.nom_latin.trim().replace(/\s+/g, ' ');
    assert.equal(csvNames.get(a.id_arbre), a.nom_latin.trim(), 'Montpellier export changed; retry');
    if (!name || /^(?:inconnu|non renseign|indétermin)/i.test(name)) { ++omitted.unknown; continue; }
    assert(/^(?:× )?[A-Z][a-z]+ (?:× )?(?:[a-z-]+|sp\.)$/.test(name), `Unexpected botanical label: ${name}`);
    let genus = name.replace(/^× /, '').split(' ')[0];
    if (nonTrees.has(genus) || shrubSpecies.has(name)) { ++omitted.shrubOrNonTree; continue; }
    name = name.replace(/ sp\.$/, '');
    if (!row.geometry) { ++omitted.noPoint; continue; }
    assert.equal(row.geometry.type, 'Point');
    assert.equal(row.geometry.coordinates.length, 2);
    let [lon, lat] = row.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 43.55 && lat < 43.7 && lon > 3.75 && lon < 3.98);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(omitted).reduce((a, b) => a + b, 0), data.features.length);
  fs.writeFileSync(path.join(__dirname, 'montpellier_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`montpellier_fr: ${trees.length}/${data.features.length}; omitted ${JSON.stringify(omitted)}`);
}

main();
