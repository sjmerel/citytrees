#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    N_CIENTIFI: string | null;
    POINT_X: string;
    POINT_Y: string;
    EST_SALUD: string | null;
    EST_MADURE: string | null;
    MODIFICACION: string | null;
  };
}

// Municipalidad de San Jose, SIG_SER_ARBOLES_CIRCULOS.
// https://www.arcgis.com/home/item.html?id=d51ef3f707354915aa54c5ab41b95613
// Public inventory, but no redistribution license or survey date is stated.
// Polygons are buffers around individual trees: use the original POINT_X/Y.
// The inventory includes ornamental shrubs, herbs and vines; omit obvious non-trees.
export function treeSite(p: Tree['attributes']) {
  if ([p.EST_SALUD, p.EST_MADURE].some(value => value?.trim().toUpperCase() === 'MUERTO') ||
      p.MODIFICACION?.trim().toUpperCase() === 'ELIMINADO') return;
  let name = p.N_CIENTIFI?.replace(/[?\uFFFD]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name || /^(?:#N\/D|INDETERMINADO|ARBOL SECO-MUERTO|MELASTOMATACEAE)$/i.test(name)) return;
  if (/^(?:Abutilon|Acalypha|Achyranthes|Agave|Allamanda|Barleria|Bougainvillea|Bouvardia|Breyna|Brunfelsia|Cajanus|Capsicum|Codiaeum|Cosmos|Duranta|Galphimia|Gossypium|Graptophyllum|Hamelia|Holmskioldia|Ipomoea|Ixora|Justicia|Lantana|Leucophyllum|Lippia|Loropetalum|Malvaviscus|Megaskepasma|Mirabilis|Musa|Mussaenda|Nerium|Odontonema|Petrea|Philodendron|Plumbago|Pseuderanthemum|Pseudomusaenda|Pseudomussaenda|Ravenala|Rhododendron|Rosa|Ruellia|Salvia|Sanchezia|Satureja|Selenicereus|Sida|Stachytarpheta|Tecomaria|Tetradenia|Thaumatophyllum|Thumbergia|Turnera|Veronica)\b/i.test(name)) return;
  if (/^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(/^[a-z]+(?:\s|$)/i.test(name), `Unexpected San Jose botanical name: ${name}`);
  assert(typeof p.POINT_X === 'string' && typeof p.POINT_Y === 'string');
  assert(p.POINT_X.trim() && p.POINT_Y.trim());
  let lon = Number(p.POINT_X.replace(',', '.'));
  let lat = Number(p.POINT_Y.replace(',', '.'));
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 9.88 && lat < 9.99 && lon > -84.18 && lon < -84.03);
  return { lat, lon, name };
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://services5.arcgis.com/0ZvuJDanWVJc4vYr/arcgis/rest/services/SIG_SER_%C3%81RBOLES_C%C3%8DRCULOS/FeatureServer/0',
    { fields: 'OBJECTID,N_CIENTIFI,POINT_X,POINT_Y,EST_SALUD,EST_MADURE,MODIFICACION',
      verifyComplete: true });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row.attributes);
    return tree ? [tree] : [];
  });
  assert(trees.length >= 5000, 'San Jose inventory has unexpectedly few usable trees');
  fs.writeFileSync(path.join(__dirname, 'sanjose_cr.json'), JSON.stringify(trees, null, 2));
  console.log(`sanjose_cr: ${trees.length} trees; ${rows.length - trees.length} records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
