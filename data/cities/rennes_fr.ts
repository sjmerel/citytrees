#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  id: number;
  genre: string;
  espece: string | null;
  abattu: number | null;
  geo_point_2d: { lat: number; lon: number } | null;
  geo_shape: { geometry: { type: string } } | null;
}

// Rennes Métropole, Arbres sur l'espace public sur Rennes Métropole:
// https://data.rennesmetropole.fr/explore/dataset/arbre/
// ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
// Distribution requires attribution/license notices, derivative-database
// share-alike and a machine-readable database/complete alterations offer.
// Communal inventories have uneven coverage; topographic-only trees generally
// have genre=Non renseigné and are excluded. Require abattu=0; omit shrubs,
// climbers and unknown identifications. Cultivars are not imported.
// Catalog processing is not an inspection date; date_maj was null throughout
// the November 2026 export. Full distinct genre/species values were audited.
// Collapse identical co-located trees; omit co-located conflicting names.
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/arbre'
  );
  let aliases: Record<string, string> = {
    Albizzia: 'Albizia', Asiminia: 'Asimina', Camelia: 'Camellia',
    Cinnamonum: 'Cinnamomum', Cladastris: 'Cladrastis', Cladrastris: 'Cladrastis',
    Clerodendron: 'Clerodendrum', Eleagnus: 'Elaeagnus',
    Laburnocyticus: 'Laburnocytisus', Thuya: 'Thuja'
  };
  let shrubs = new Set([
    'Amorpha', 'Anagyris', 'Aucuba', 'Buddleia', 'Buxus', 'Callicarpa',
    'Cotoneaster', 'Cytisus', 'Decaisnea', 'Exochorda', 'Garrya', 'Hamamelis',
    'Hibiscus', 'Hippophae', 'Lonicera', 'Parrotiopsis', 'Rhamnus',
    'Rhododendron', 'Sorbaria', 'Staphylea', 'Viburnum', 'Vitis'
  ]);
  let shrubSpecies = new Set([
    'Aesculus parviflora', 'Alnus alnobetula', 'Cornus sanguinea',
    'Elaeagnus ebbingei', 'Euonymus japonicus', 'Juniperus horizontalis',
    'Juniperus x pfitzeriana', 'Ligustrum ibota', 'Ligustrum vulgare',
    'Ligustrum vulgaris', 'Photinia x fraseri', 'Pinus mugo',
    'Prunus fruticosa', 'Prunus x fruticans', 'Robinia hispida',
    'Salix appendiculata', 'Salix aurita', 'Salix hookerianum',
    'Salix integra', 'Salix rosemarinifolia', 'Salix sachalinensis',
    'Syringa chinensis', 'Syringa vulgaris', 'Taxus canadensis'
  ]);
  let ambiguous = new Set([
    'Acer distichum', 'Aesculus sylvatica', 'Castanea fagus', 'Corylus oxyacantha',
    'Ilex triacanthos', 'Malus avium', 'Quercus avium', 'Salix acerifolia',
    'Salix saccharinum', 'Stewartia persica', 'Trachycarpus saccharinum',
    'Trachycarpus washingtonia'
  ]);
  let cultivars = new Set([
    'accolade', 'amanogawa', 'bigarreau', 'butterflies', 'chocolate', 'eleyi',
    'everest', 'flore', 'galaxy', 'globosum', 'golden homet', 'kanzan', 'lobel',
    'maya', 'myrobolan', 'myrobolana', 'pandora', 'perpetu', 'pissardii',
    'red sentinel', 'resista', 'shirotae', 'spire', 'susan', 'taihaku',
    'x evereste', 'x john downie', 'x perpetu', 'x perpetue'
  ]);
  let ids = new Set<number>();
  let omitted = { removedOrUnconfirmed: 0, unknown: 0, shrubOrClimber: 0, ambiguous: 0, noPoint: 0 };
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    assert(Number.isSafeInteger(row.id) && !ids.has(row.id), 'Invalid/repeated Rennes ID');
    ids.add(row.id);
    assert(typeof row.genre === 'string');
    assert(row.espece === null || typeof row.espece === 'string');
    assert(row.abattu === null || row.abattu === 0 || row.abattu === 1);
    if (row.abattu !== 0) { ++omitted.removedOrUnconfirmed; continue; }
    let genus = row.genre.trim();
    if (!genus || /^(?:Non |Autre$)/.test(genus)) { ++omitted.unknown; continue; }
    genus = genus[0].toUpperCase() + genus.slice(1);
    genus = aliases[genus] ?? genus;
    if (genus === 'X Chitalpa') genus = '× Chitalpa';
    assert(/^(?:× )?[A-Z][a-z]+$/.test(genus), `Unexpected genus: ${row.genre}`);
    let species = row.espece?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
    let sourceName = `${genus} ${species}`.trim();
    if (ambiguous.has(sourceName)) { ++omitted.ambiguous; continue; }
    if (shrubs.has(genus) || shrubSpecies.has(sourceName)) { ++omitted.shrubOrClimber; continue; }
    if (!/^(?:x )?[a-z-]+$/.test(species) ||
        /^(?:sp\.?|autre|non renseigné|x)$/.test(species) || cultivars.has(species)) species = '';
    let name = [genus, species].filter(Boolean).join(' ');
    if (!row.geo_point_2d) { ++omitted.noPoint; continue; }
    assert.equal(row.geo_shape?.geometry.type, 'Point');
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 47.93 && lat < 48.32 && lon > -1.98 && lon < -1.45);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(omitted).reduce((a, b) => a + b, 0), rows.length);
  let beforeDeduplication = trees.length;
  let sites = new Map<string, (typeof trees)[number] | null>();
  for (let tree of trees) {
    let key = `${tree.lat},${tree.lon}`;
    let previous = sites.get(key);
    if (previous === null) continue;
    if (previous && previous.name !== tree.name) sites.set(key, null);
    else if (!previous) sites.set(key, tree);
  }
  trees = [...sites.values()].filter(tree => tree !== null);
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'rennes_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`rennes_fr: ${trees.length}/${rows.length}; omitted ${JSON.stringify(omitted)}; ${beforeDeduplication - trees.length} co-located omissions`);
}

main();
