#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    OBJECTID: number;
    GENRE: string;
    ESPEC: string | null;
    SUPPR: string;
    LIBRE: string;
  };
  geometry: { x: number; y: number } | null;
}

// Brest métropole / Espaces verts, Les arbres MYB41:
// https://www.data.gouv.fr/datasets/les-arbres
// Licence Ouverte 2.0; credit Brest métropole and the reused data's update date:
// https://www.data.gouv.fr/pages/legal/licences/etalab-2-0
// Individual maintained trees, including botanical-garden exotics.
// DTPLA is planting year, not inspection date; the catalog date is not a survey.
// LIBRE=oui retains botanical labels but may mean vacant: omit conservatively.
// Full genus/species audit also found shrubs, climbers, spelling errors and
// incompatible genus/epithet combinations. Omit ambiguous identifications;
// omit cultivars and retain genus when species is unspecified.
// Collapse identical co-located trees; omit co-located conflicting names.
async function main() {
  let endpoint = 'https://geo.brest-metropole.fr/arcgis/rest/services/public/GPB_ESP_Intra_EV_Arbres/MapServer/1411070';
  let rows: Tree[] = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,GENRE,ESPEC,SUPPR,LIBRE',
    returnGeometry: true, verifyComplete: true
  });
  let aliases: Record<string, string> = {
    Acoelorraphe: 'Acoelorrhaphe', Albizzia: 'Albizia', Arbustus: 'Arbutus',
    Aulne: 'Alnus', Bettula: 'Betula', Caliandra: 'Calliandra',
    Camelia: 'Camellia', Cladastris: 'Cladrastis',
    Cladrans: 'Cladrastis', Draceana: 'Dracaena', Drymis: 'Drimys',
    Eleagnus: 'Elaeagnus', Eryobotria: 'Eriobotrya', Evodia: 'Tetradium',
    Gingko: 'Ginkgo', Ginko: 'Ginkgo',
    Heptacodion: 'Heptacodium', Hoeria: 'Hoheria', Koelreutaria: 'Koelreuteria',
    Lagerstomia: 'Lagerstroemia', Lagerstromia: 'Lagerstroemia',
    Lagestroemia: 'Lagerstroemia', Linodendron: 'Liriodendron',
    Livistonia: 'Livistona', Magnollia: 'Magnolia', Mangolia: 'Magnolia',
    Michella: 'Michelia', Nashi: 'Pyrus', Parajubea: 'Parajubaea',
    Parotia: 'Parrotia', Philica: 'Phylica', Qercus: 'Quercus',
    Shinus: 'Schinus', Siadopitys: 'Sciadopitys', Thuya: 'Thuja',
    Toumefortia: 'Tournefortia', Tracycarpus: 'Trachycarpus',
    Whashingtonia: 'Washingtonia', Zanthoxyllum: 'Zanthoxylum'
  };
  let shrubs = new Set([
    'Abutilon', 'Aronia', 'Aucuba', 'Beaumontia', 'Boronia', 'Bougainvillea',
    'Bouginvillea', 'Brillantaisia', 'Buddleja', 'Buxus', 'Caesalpinia',
    'Calothamnus', 'Cantua', 'Cerstrum', 'Cistus', 'Clianthus', 'Colletia',
    'Colquhounia', 'Colutea', 'Convolvulus', 'Cotoneaster', 'Durancta',
    'Enkianthus', 'Euomynus', 'Euphorbia', 'Fuschia', 'Goodia', 'Grewia',
    'Hamamelis', 'Iochroma', 'Isopogon', 'Leucadendron', 'Leucospermum',
    'Lonicera', 'Luculia', 'Mahonia', 'Nerium', 'Pandorea', 'Phymosia',
    'Protea', 'Serruria', 'Solandra', 'Stachyurus', 'Staphylea', 'Strophanthus',
    'Syringa', 'Telopea', 'Tetrapanax', 'Tibouchina', 'Viburnum', 'Wisteria'
  ]);
  let ambiguous = new Set([
    'Acer robur', 'Crinodendron trichotonum', 'Cupressus castaneifolia',
    'Fraxinus campestre', 'Magnolia cerris', 'Magnolia sylvestris',
    'Sophora julibrissin', 'Tilia pseudoplatanus'
  ]);
  let shrubSpecies = new Set([
    'Acacia boormanii', 'Acacia cultriformis', 'Acacia verticillata',
    'Banksia ericifolia', 'Grevillea johnsonii', 'Grevillea robyn gordon',
    'Grevillea scralet sprite x alpina', 'Pinus mugo', 'Prunus fruticosa',
    'Robinia hispida', 'Salix integra'
  ]);
  let omitted = { vacantOrRemoved: 0, unknown: 0, shrubOrClimber: 0, ambiguous: 0, noPoint: 0 };
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    let a = row.attributes;
    assert(typeof a.GENRE === 'string');
    assert(a.ESPEC === null || typeof a.ESPEC === 'string');
    assert(['non', 'oui'].includes(a.SUPPR) && ['non', 'oui'].includes(a.LIBRE));
    if (a.SUPPR !== 'non' || a.LIBRE !== 'non') { ++omitted.vacantOrRemoved; continue; }
    let genus = a.GENRE.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    if (!genus || genus.startsWith('non ')) { ++omitted.unknown; continue; }
    genus = genus[0].toUpperCase() + genus.slice(1);
    genus = aliases[genus] ?? genus;
    assert(/^[A-Z][a-z]+$/.test(genus), `Unexpected genus: ${a.GENRE}`);
    let species = a.ESPEC?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';
    let sourceName = `${genus} ${species}`.trim();
    if (ambiguous.has(sourceName)) { ++omitted.ambiguous; continue; }
    if (shrubs.has(genus) || shrubSpecies.has(sourceName)) { ++omitted.shrubOrClimber; continue; }
    // Unspecified species and cultivar-only or uncertain labels are genus-only.
    if (!/^(?:x )?[a-z-]+(?: (?:x|subsp\.) [a-z-]+)?$/.test(species) ||
        /^(?:sp|x|hybride|non renseigne|non renseigné|aff .+|sp .+)$/.test(species) ||
        /^(?:accolade|apollo|betty|black tulip|columella|columnella|courtarou|everest|indian charms|lutece|lutèce|suzan|umineko|vulcan|x nymansay)$/.test(species)) species = '';
    let name = [genus, species].filter(Boolean).join(' ');
    if (!row.geometry) { ++omitted.noPoint; continue; }
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 48.3 && lat < 48.5 && lon > -4.65 && lon < -4.25);
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
  fs.writeFileSync(path.join(__dirname, 'brest_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`brest_fr: ${trees.length}/${rows.length}; omitted ${JSON.stringify(omitted)}; ${beforeDeduplication - trees.length} co-located omissions`);
}

main();
