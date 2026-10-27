#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  gid: number;
  espece: string | null;
  statut: string;
  date_disparition: string | null;
  forme: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Bordeaux Metropole, Patrimoine arbore; Licence Ouverte (original version).
// https://opendata.bordeaux-metropole.fr/explore/dataset/ec_arbre_p/
// https://www.etalab.gouv.fr/wp-content/uploads/2014/05/Licence_Ouverte.pdf
// Attribute Bordeaux Metropole and indicate name/filter processing.
// Partial municipal streets, parks and facilities, including La Dune, Arcachon.
// cdate/mdate are record dates, not inspections. Even some VIVANT records have
// a disappearance date or are ecological snags: exclude these contradictions.
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/ec_arbre_p');
  let ids = new Set<number>();
  let trees = [];
  for (let row of rows) {
    assert(Number.isSafeInteger(row.gid) && !ids.has(row.gid), 'Invalid/repeated Bordeaux tree ID');
    ids.add(row.gid);
    assert(['VIVANT', 'MORT', 'SOUCHE', 'PROJET'].includes(row.statut));
    if (row.statut !== 'VIVANT' || row.date_disparition || row.forme === 'CHANDELLE_NICHE_ECOLOGIQUE') continue;
    assert(row.espece === null || typeof row.espece === 'string');
    let name = row.espece?.replace(/\s+/g, ' ').trim();
    if (!name || /^Ind\u00e9termin\u00e9$/i.test(name)) continue;
    if (/^(?:Actinidia|Calycanthus|Chimonanthus|Chimonobambusa|Hamamelis|Manihot|Nerium|Orixa|Philadelphus|Phyllostachys|Pseudosasa|Viburnum|Wisteria)\b/.test(name)) continue;
    if (/^(?:Aesculus parviflora|Cassia sophera|Cornus (?:alba|sanguinea)|Ligustrum vulgare|Prunus (?:fructicosa|tomentosa|triloba)|Rhus toxicodendron|Sabal minor|Salix purpurea)\b/.test(name)) continue;
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 44.6 && lat < 45 && lon > -1.25 && lon < -0.4);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'bordeaux_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`bordeaux_fr: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
