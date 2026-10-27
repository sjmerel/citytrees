#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  id: number;
  genre: string | null;
  espece: string | null;
  cultivar_variete: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Toulouse Metropole, Arbres urbains; Licence Ouverte v2.0 (Etalab).
// https://data.toulouse-metropole.fr/explore/dataset/arbres-urbains/
// Attribute Toulouse Metropole / INSEE IGN and indicate name/filter processing.
// Mostly Toulouse, with partial coverage of seven neighboring municipalities.
// September 2026 export is not an inspection date; date_plantation is planting.
// Zero/unrecorded dimensions and Sans objet development stages are incomplete
// measurements, not removal flags. No separate health/removal field is provided.
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/arbres-urbains');
  let ids = new Set<number>();
  let trees = [];
  for (let row of rows) {
    assert(Number.isSafeInteger(row.id) && !ids.has(row.id), 'Invalid/repeated Toulouse tree ID');
    ids.add(row.id);
    assert(row.genre === null || typeof row.genre === 'string');
    assert(row.espece === null || typeof row.espece === 'string');
    assert(row.cultivar_variete === null || typeof row.cultivar_variete === 'string');
    let genus = row.genre?.trim();
    if (!genus || !/^(?:x )?[A-Z][a-z]+$/.test(genus)) continue;
    if (/^(?:Bignonia|Buddleja|Ceanothus|Chandelle|Cotoneaster|Deutzia|Escallonia|Hamamelis|Hibiscus|Nerium|Philadelphus|Pyracantha|Rhododendron|Souche|Syria|Viburnum|Wisteria)$/.test(genus)) continue;
    let species = row.espece?.trim().replace(/^x\./, 'x ');
    if (/^(?:0_.*|sp\.?|x(?: hybride)?)$/.test(species ?? '')) species = '';
    let cultivar = row.cultivar_variete?.trim().replace(/["']/g, '');
    if (genus === 'Malus' && /^(?:Everest|Golden-hornet|x Coccinella\(R\))$/.test(species ?? '')) {
      cultivar = [species, cultivar].filter(Boolean).join(' ');
      species = '';
    }
    if (genus === 'Ulmus') {
      if (/^(?:x )?resista$/.test(species ?? '')) species = '';
      if (species === 'lutece\u00ae') {
        cultivar = ['Lutece', cultivar].filter(Boolean).join(' ');
        species = '';
      }
      species = species?.replace(/ VADA\u00ae$/, '');
    }
    let name = [genus, species].filter(Boolean).join(' ').replace(/\s+/g, ' ');
    if (/^(?:Cornus sanguinea|Cotoneaster franchettii|Ligustrum (?:ibota|vulgare)|Prunus fruticosa|Quercus (?:ilicifolia|lusitanica|prinoides)|Robinia hispida|Sabal minor|Salix purpurea)$/.test(name)) continue;
    if (cultivar) {
      if (/^(?:var|subsp)\./.test(cultivar)) name += ` ${cultivar.replace(/\./g, '. ')}`;
      else name += ` '${cultivar.replace(/\bcv\./g, '').trim()}'`;
    }
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 43.5 && lat < 43.7 && lon > 1.3 && lon < 1.55);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'toulouse_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`toulouse_fr: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
