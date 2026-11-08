#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  id_emplacement: number | null;
  code_insee: number | null;
  proprietaire: string | null;
  statut: string | null;
  lib_genre: string | null;
  lib_espece: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Nantes Metropole et Ville de Nantes; Licence Ouverte-LO.
// https://data.nantesmetropole.fr/explore/dataset/244400404_patrimoine-arbore-nantes-metropole/
// Roadside trees in 24 communes, plus Nantes municipal parks, gardens/schools;
// not all municipal parks outside Nantes. Only explicitly Plante (accented)
// locations are retained; "2668" is an undocumented status, not assumed planted.
// Export processed 2026-02-20; date_inventaire spans 2002-2025, despite the
// obsolete 2013 modified metadata. Do not interpret processing as a survey.
// variete contains numeric codes without a crosswalk, so omit it. Species
// contains cultivars and hybrid labels too; retain genus-only when ambiguous.
// Site numbers repeat across communes and owners; verify the composite ID.
// Six records lack site numbers (including two otherwise identified trees).
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_patrimoine-arbore-nantes-metropole');
  let ids = new Set<string>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    if (row.id_emplacement === null) continue;
    assert(Number.isSafeInteger(row.id_emplacement) && Number.isSafeInteger(row.code_insee));
    assert(typeof row.proprietaire === 'string' && row.proprietaire.length > 0);
    let id = JSON.stringify([row.proprietaire, row.code_insee, row.id_emplacement]);
    assert(!ids.has(id), 'Repeated Nantes tree ID within owner/commune');
    ids.add(id);
    assert([null, 'Planté', 'A qualifier', '2668'].includes(row.statut));
    if (row.statut !== 'Planté') continue;
    assert(row.lib_genre === null || typeof row.lib_genre === 'string');
    assert(row.lib_espece === null || typeof row.lib_espece === 'string');
    let genus = row.lib_genre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!genus || ['EMPLACEMENT CONSERVE', 'Non determine'].includes(genus)) continue;
    if (/^(?:Agatis|Cladastris|Eretia|Eucomia|Jubea)$/.test(genus)) continue;
    let hybridGenus = / \([xX]\)$/.test(genus);
    genus = genus.replace(/ \([xX]\)$/, '').replace(/^./, c => c.toUpperCase());
    assert(/^[A-Z][a-z]+$/.test(genus), `Unexpected Nantes genus: ${genus}`);
    if (/^(?:Buxus|Camellia|Cephalotaxus|Chaenomeles|Cotinus|Cycas|Euonymus|Fontanesia|Garrya|Hamamelis|Hibiscus|Lycium|Musa|Myrtus|Phyllostachys|Sambucus|Solanum|Wisteria|Yucca)$/.test(genus)) continue;
    let species = row.lib_espece?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim() ?? '';
    if (species === 'VIDE') continue;
    if ((genus === 'Pinus' && /^mugo\b/.test(species)) ||
      (genus === 'Juniperus' && /^media\b/i.test(species))) continue;
    let hybrid = /\([xX×]\)|^[xX] | [xX]$/.test(species);
    species = species.replace(/\s*\([xX×]\)/g, '').replace(/^[xX] | [xX]$/g, '').trim();
    if (genus === 'Quercus' && species === 'bimundorum CRIMSON SPIRE') species = 'bimundorum';
    // Uppercase values that really are species, rather than cultivar labels.
    if (/^(?:Conferta|Germanica|Quassoides|Engleriana|Fortunei|Communis|Laevigata|Yunnannensis|Dulcis|Doltsopa|Lotus|Amoena|Calliprinos)$/.test(species)) {
      species = species.toLowerCase();
    }
    if (/^(?:sp|non determinee|hybride|resista|lutece|columella|everest|picotee|pondain|arteaga)$/i.test(species) ||
      !/^[a-z][a-z-]+$/.test(species)) {
      species = '';
    }
    // These combinations have no exact species match in GBIF; keep the known
    // genus instead of accepting a fuzzy match to a different species/genus.
    if (/^(?:Ligustrum styraciflua|Photinia serrula|Prunus (?:nobilis|pisifera)|Quercus (?:oliverianum|padus|platyphyllos))$/.test(`${genus} ${species}`)) species = '';
    let name = [hybridGenus ? `x ${genus}` : genus,
      species ? `${hybrid && !hybridGenus ? 'x ' : ''}${species}` : ''].filter(Boolean).join(' ');
    if (/^(?:Aesculus parviflora|Cornus sanguinea|Elaeagnus umbellata|Juniperus (?:humilis|media)|Ligustrum vulgare|Myrica pennsylvanica|Photinia x fraseri|Pinus mugo|Prunus (?:fruticosa|glandulosa|laurocerasus|spinosa|tomentosa)|Quercus (?:coccifera|ilicifolia|lusitanica|microphylla)|Rhamnus utilis|Robinia hispida|Salix (?:aurita|integra|x purpurea)|Syringa vulgaris)$/.test(name)) continue;
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 47.10 && lat < 47.35 && lon > -1.95 && lon < -1.36);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'nantes_fr.json'), JSON.stringify(trees, null, 2));
  console.log(`nantes_fr: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
