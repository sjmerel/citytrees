#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { CityUtil } from './city_util';

interface CityTree {
  elem_point_id: string;
  categorie_desc: string;
  genre_bota: string;
  espece: string;
  anneeabattage: string;
  essouchement: string;
  causeabattage: string;
  geo_point_2d: string;
}

interface MetroTree {
  type: string;
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: {
    ogc_fid: string;
    commune: string | null;
    genre: string | null;
    espece: string | null;
  };
}

// Ville de Grenoble, Arbres de la Ville de Grenoble (CSV, 2026-02-28):
// https://data.metropolegrenoble.fr/visualisation/information/?id=arbres-grenoble
// Grenoble Alpes Métropole, Patrimoine arboré du territoire Métropolitain
// (GeoJSON snapshot 2023-09-11, NOT the daily 2026 catalog refresh):
// https://data.metropolegrenoble.fr/visualisation/information/?id=patrimoine_arbore_du_territoire_metropolitain
// Both ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
// Retain both source/license notices; assess derivative-database share-alike
// and the machine-readable database/complete alterations offer before distribution.
// Use the newer city inventory for Grenoble, including Métropole-managed sites.
// Supplement ONLY other communes from the larger but older metro export.
// Omit metro Grenoble/unknown communes and points within the official Grenoble
// boundary to prevent geographic overlap even when commune labels are wrong.
// City excludes Bastille and inventories only larger semi-natural woodland trees.
// Removal fields were empty throughout; metro has no removal/inspection fields.
// id_metro is reused at unrelated positions; ogc_fid is the unique source ID.
// Full botanical values audited; omit shrubs, unknowns, dead "chandelle seche",
// ambiguous labels and cultivars. Genus-only identifications remain valid.
// Collapse identical co-located trees; omit co-located conflicting names.
async function main() {
  let cityUrl = 'https://data.metropolegrenoble.fr/sites/default/files/dataset/761/24734-6258-4184-a964-1af2e4f68ce9/arbres_grenoble_epsg4326.csv';
  let metroUrl = 'https://data.metropolegrenoble.fr/sites/default/files/dataset/2023/09/11/965f573d-52da-46df-8cd6-90df2f014df6/open_data1espnat_pat_arbore_tous_amnjkb.geojson.geojson';
  let cityResponse = await CityUtil.getWithRetry(cityUrl, { responseType: 'text', timeout: 240000 });
  let cityRows: CityTree[] = parse(cityResponse.data, { columns: true, bom: true, skip_empty_lines: true });
  let portal = await CityUtil.getWithRetry(
    'https://data.metropolegrenoble.fr/visualisation/information/?id=arbres-grenoble',
    { responseType: 'text', timeout: 120000 }
  );
  let counts = [...portal.data.matchAll(/&quot;preview_rows&quot;:(\d+)/g)];
  assert.equal(counts.length, 1, 'Missing/ambiguous Grenoble CSV catalog count');
  assert.equal(cityRows.length, Number(counts[0][1]), 'Incomplete Grenoble CSV');
  let metroResponse = await CityUtil.getWithRetry(metroUrl, { timeout: 240000 });
  let metro: {
    type: string; features: MetroTree[]; totalFeatures: number;
    numberMatched: number; numberReturned: number;
    crs: { properties: { name: string } };
  } = metroResponse.data;
  assert.equal(metro.type, 'FeatureCollection');
  assert(Array.isArray(metro.features) && metro.features.length > 0);
  assert.equal(metro.features.length, metro.totalFeatures);
  assert.equal(metro.features.length, metro.numberMatched);
  assert.equal(metro.features.length, metro.numberReturned);
  assert.equal(metro.crs.properties.name, 'urn:ogc:def:crs:EPSG::4326');
  let boundaryResponse = await CityUtil.getWithRetry(
    'https://geo.api.gouv.fr/communes/38185?format=geojson&geometry=contour',
    { timeout: 120000 }
  );
  let boundary: {
    type: string; properties: { code: string };
    geometry: { type: string; coordinates: [number, number][][] };
  } = boundaryResponse.data;
  assert.equal(boundary.type, 'Feature');
  assert.equal(boundary.properties.code, '38185');
  assert.equal(boundary.geometry.type, 'Polygon');
  assert.equal(boundary.geometry.coordinates.length, 1);
  let ring = boundary.geometry.coordinates[0];
  assert(ring.length > 3 && ring.every(p => p.length === 2 && p.every(Number.isFinite)));
  function insideGrenoble(lon: number, lat: number) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      let [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  let aliases: Record<string, string> = {
    Aulnus: 'Alnus', Cladastris: 'Cladrastis',
    Clerodendron: 'Clerodendrum', Dyospiros: 'Diospyros', Eleagnus: 'Elaeagnus',
    Euodia: 'Tetradium', Punus: 'Prunus', Tlia: 'Tilia'
  };
  let shrubs = new Set([
    'Buxus', 'Chimonanthus', 'Hibiscus', 'Lonicera', 'Staphylea'
  ]);
  let shrubSpecies = new Set([
    'Aesculus parviflora', 'Alnus viridis', 'Cornus sanguinea',
    'Corylus avellana', 'Euonymus japonicus',
    'Juniperus communis', 'Ligustrum ibota', 'Ligustrum sinense',
    'Ligustrum vulgare', 'Photinia fraseri', 'Pinus mugo',
    'Prunus triloba', 'Robinia hispida', 'Salix purpurea', 'Salix rosmarinifolia',
    'Sorbus chamaemespilus', 'Syringa persica', 'Syringa vulgaris'
  ]);
  let ambiguous = new Set(['Aquifolium', 'Cypres', 'Erable', 'Troene', 'Tulipier']);
  let incompatible = new Set([
    'Acer frainetto', 'Acer hippocastanum', 'Acer velutina', 'Acer wislizeni',
    'Alnus acerifolia', 'Alnus cerris', 'Alnus lamarckii', 'Alnus ornus',
    'Alnus platyphyllos', 'Carpinus baccata', 'Celtis siliquastrum',
    'Cercis hippocastanum', 'Cercis serrulata', 'Cornus campestre',
    'Cornus lamarckii', 'Corylus cordiformis', 'Cupressus carpinifolium',
    'Gleditsia triandra', 'Juniperus biloba', 'Koelreuteria biloba',
    'Magnolia negundo', 'Malus excelsior', 'Malus lamarckii', 'Malus ornus',
    'Malus spaethii', 'Malus triandra', 'Malus trojana', 'Olea daniellii',
    'Pinus calleryana', 'Pinus serrulata', 'Pinus tomentosa',
    'Populus quadrangulata', 'Prunus calleryana', 'Prunus stenoptera',
    'Prunus tatarinowii', 'Prunus wislizeni', 'Pyrus bignonioides',
    'Quercus styraciflua', 'Sequoiadendron sempervirens', 'Taxodium dioicus',
    'Zelkova triacanthos', 'Zelkova tulipifera'
  ]);
  let cultivars = new Set([
    'accolade', 'everest', 'frontier', 'galaxy', 'hybride', 'lutece',
    'pacific sunset', 'perpetu', 'pink giant', 'pissardii', 'platanor', 'resista', 'x galaxy'
  ]);
  let omitted = {
    city: { removed: 0, unknown: 0, shrub: 0, ambiguous: 0, noPoint: 0 },
    metro: { overlapOrUnknownCommune: 0, removed: 0, unknown: 0, shrub: 0, ambiguous: 0, noPoint: 0 }
  };
  function botanical(genusValue: string | null, speciesValue: string | null, source: 'city' | 'metro') {
    assert(genusValue === null || typeof genusValue === 'string');
    assert(speciesValue === null || typeof speciesValue === 'string');
    let genus = genusValue?.trim().normalize('NFD').replace(/\p{M}/gu, '') ?? '';
    if (!genus || /^inconnu$/i.test(genus)) { ++omitted[source].unknown; return null; }
    genus = genus[0].toUpperCase() + genus.slice(1);
    // A few metro genus fields contain a complete taxon, sometimes a cultivar.
    let embedded = genus.split(/\s+/);
    genus = embedded[0];
    genus = aliases[genus] ?? genus;
    if (ambiguous.has(genus)) { ++omitted[source].ambiguous; return null; }
    assert(/^[A-Z][a-z]+$/.test(genus), `Unexpected Grenoble genus: ${genusValue}`);
    let species = (embedded.length > 1 ? embedded.slice(1).join(' ') : speciesValue?.trim() ?? '').toLowerCase();
    if (species === 'chandelle seche') { ++omitted[source].removed; return null; }
    let name = `${genus} ${species}`.trim();
    if (incompatible.has(name)) { ++omitted[source].ambiguous; return null; }
    if (shrubs.has(genus) || shrubSpecies.has(name)) { ++omitted[source].shrub; return null; }
    if (!/^(?:x )?[a-z-]+$/.test(species) || /^(?:sp\.?|n\.d\.|x|autre)$/.test(species) ||
        cultivars.has(species)) {
      // Preserve a valid leading epithet where the remainder is a cultivar.
      let match = species.match(/^((?:x )?[a-z-]+) [A-Z]/i);
      species = match && /[A-Z]/.test(speciesValue ?? '') ? match[1] : '';
      if (cultivars.has(species)) species = '';
    }
    return [genus, species].filter(Boolean).join(' ');
  }
  let trees: { lat: number; lon: number; name: string }[] = [];
  let cityIds = new Set<string>();
  for (let row of cityRows) {
    assert(row.elem_point_id !== '' && !cityIds.has(row.elem_point_id), 'Repeated Grenoble city ID');
    cityIds.add(row.elem_point_id);
    assert.equal(row.categorie_desc, 'Arbre');
    assert([row.anneeabattage, row.essouchement, row.causeabattage].every(v => typeof v === 'string'));
    if (row.anneeabattage || row.essouchement || row.causeabattage) { ++omitted.city.removed; continue; }
    let name = botanical(row.genre_bota, row.espece, 'city');
    if (!name) continue;
    if (!row.geo_point_2d) { ++omitted.city.noPoint; continue; }
    let coordinates = row.geo_point_2d.split(',').map(Number);
    assert.equal(coordinates.length, 2);
    let [lat, lon] = coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 45.1 && lat < 45.25 && lon > 5.65 && lon < 5.8);
    trees.push({ lat, lon, name });
  }
  let cityCount = trees.length;
  let metroIds = new Set<string>();
  for (let row of metro.features) {
    assert.equal(row.type, 'Feature');
    let a = row.properties;
    assert(typeof a.ogc_fid === 'string' && a.ogc_fid !== '' && !metroIds.has(a.ogc_fid));
    metroIds.add(a.ogc_fid);
    assert(a.commune === null || typeof a.commune === 'string');
    if (!a.commune || a.commune.toUpperCase() === 'GRENOBLE') { ++omitted.metro.overlapOrUnknownCommune; continue; }
    if (!row.geometry) { ++omitted.metro.noPoint; continue; }
    assert.equal(row.geometry.type, 'Point');
    assert.equal(row.geometry.coordinates.length, 2);
    let [lon, lat] = row.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 44.95 && lat < 45.32 && lon > 5.55 && lon < 5.9);
    if (insideGrenoble(lon, lat)) { ++omitted.metro.overlapOrUnknownCommune; continue; }
    let name = botanical(a.genre, a.espece, 'metro');
    if (name) trees.push({ lat, lon, name });
  }
  assert(cityCount > 0 && trees.length > cityCount);
  assert.equal(cityCount + Object.values(omitted.city).reduce((a, b) => a + b, 0), cityRows.length);
  assert.equal(trees.length - cityCount + Object.values(omitted.metro).reduce((a, b) => a + b, 0), metro.features.length);
  let sites = new Map<string, { tree: (typeof trees)[number]; source: 'city' | 'metro' } | null>();
  for (let [index, tree] of trees.entries()) {
    let key = `${tree.lat},${tree.lon}`;
    let previous = sites.get(key);
    if (previous === null) continue;
    if (previous && previous.tree.name !== tree.name) sites.set(key, null);
    else if (!previous) sites.set(key, { tree, source: index < cityCount ? 'city' : 'metro' });
  }
  let uniqueSites = [...sites.values()].filter(site => site !== null);
  let uniqueCityCount = uniqueSites.filter(site => site.source === 'city').length;
  let uniqueMetroCount = uniqueSites.length - uniqueCityCount;
  let coLocatedOmissions = { city: cityCount - uniqueCityCount, metro: trees.length - cityCount - uniqueMetroCount };
  trees = uniqueSites.map(site => site.tree);
  assert(uniqueCityCount > 0 && uniqueMetroCount > 0);
  fs.writeFileSync(path.join(__dirname, 'grenoble_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`grenoble_fr: ${trees.length} (${uniqueCityCount}/${cityRows.length} city + ${uniqueMetroCount}/${metro.features.length} metro); omitted ${JSON.stringify(omitted)}; co-located omissions ${JSON.stringify(coLocatedOmissions)}`);
}

main();
