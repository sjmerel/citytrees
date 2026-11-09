#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    objectid: number;
    id_individuo_disperso: number;
    s_especie: string | null;
    municipio: string;
    s_estado_individuo: string;
    s_estado_arbol: string | null;
  };
  geometry: { points: [number, number][] } | null;
}

// GeoMedellin, Arbol Urbano (Mapa de Referencia); CC BY-SA 4.0.
// https://www.medellin.gov.co/geomedellin/datosAbiertos/398
// The catalog's public getopendata GP job explicitly names this source layer.
// The incomplete metropolitan inventory also contains shrubs and interventions.
// Import only active, nondead Medellin individuals with singleton geometries;
// collapse identical repeated individuals, not distinct trees sharing a position.
// tipoarbol is a cultural classification, not a botanical tree/shrub indicator.
// Exclude known non-tree taxa, but some small tree/shrub taxa remain ambiguous.
// Daily service processing and catalog refresh dates are not field survey dates.
function botanicalName(value: string | null): string | undefined {
  if (!value) return;
  let name = value.replace(/×/g, ' x ').replace(/\s+/g, ' ').trim();
  if (!name || /^Desconocid[ao]\b/.test(name)) return;
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Medellin botanical name: ${name}`);
  if (/^(?:Abutilon|Allamanda|Bambusa|Bougainvillea|Cajanus|Carludovica|Cereus|Chusquea|Gossypium|Jasminum|Megaskepasma|Musa|Nerium|Nicotiana|Petiveria|Petrea|Plumbago|Pyracantha|Ricinus|Rosa|Trichocereus|Trichostigma|Triphasia)\b/.test(name)) return;
  if (/^(?:Acalypha (?:hispida|wilkesiana)|Cestrum (?:aurantiacum|nocturnum)|Codiaeum variegatum|Coffea arabica|Cordyline terminalis|Cotoneaster pannosus|Dracaena (?:deremensis|fragrans|sanderiana)|Duranta erecta|Euphorbia (?:lactea|pulcherrima|umbellata)|Gardenia jasminoides|Graptophyllum pictum|Guadua angustifolia|Hibiscus (?:mutabilis|rosa-sinensis|sabdariffa|syriacus)|Ixora (?:coccinea|finlaysoniana)|Leea coccinea|Malvaviscus arboreus|Medinilla magnifica|Polyscias (?:fruticosa|guilfoylei))\b/.test(name)) return;
  return name;
}

function treeSites(rows: Tree[]) {
  let trees = new Map<number, { lat: number; lon: number; name: string }>();
  for (let row of rows) {
    let p = row.attributes;
    assert(Number.isSafeInteger(p.id_individuo_disperso) && p.id_individuo_disperso > 0);
    assert(p.s_especie === null || typeof p.s_especie === 'string');
    if (p.municipio !== 'MEDELLÍN' || p.s_estado_individuo !== 'Activo' || p.s_estado_arbol === 'Individuo Muerto') continue;
    let name = botanicalName(p.s_especie);
    if (!name || !row.geometry) continue;
    assert(Array.isArray(row.geometry.points));
    if (row.geometry.points.length !== 1) continue;
    let [lon, lat] = row.geometry.points[0];
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    // Rounded municipal-subdivision bounds reject erroneous faraway locations.
    if (lat < 6.15 || lat > 6.39 || lon < -75.74 || lon > -75.45) continue;
    let tree = { lat, lon, name };
    let previous = trees.get(p.id_individuo_disperso);
    if (previous) {
      assert.deepEqual(previous, tree, `Conflicting Medellin individual ${p.id_individuo_disperso}`);
      continue;
    }
    trees.set(p.id_individuo_disperso, tree);
  }
  return Array.from(trees.values());
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://www.medellin.gov.co/servidormapas/rest/services/ambiente_dllo_sost/VC_Gestion_Ambiental/MapServer/0',
    { where: "municipio='MEDELLÍN' AND s_estado_individuo='Activo' AND (s_estado_arbol IS NULL OR s_estado_arbol<>'Individuo Muerto')",
      fields: 'objectid,id_individuo_disperso,s_especie,municipio,s_estado_individuo,s_estado_arbol',
      returnGeometry: true, verifyComplete: true });
  let trees = treeSites(rows);
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'medellin_co.json'), JSON.stringify(trees, null, 2));
  console.log(`medellin_co: ${trees.length} trees; ${rows.length - trees.length} rows omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
