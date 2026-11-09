#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    OBJECTID: number;
    NOM_LATIN: string | null;
    STATUT: string;
  };
  geometry: { x: number; y: number } | null;
}

// CJB / OCAN, Inventaire Cantonal des Arbres isoles hors forets.
// https://sitg.ge.ch/donnees/sipv-ica-web-public-tot
// Reuse requires authorization; this project's owner has confirmed permission.
// The four Geneva city subdivisions have COMMUNE values beginning "Geneve"
// (with an accent), not a single COMMUNE='Geneve' record.
// STATUT describes observation quality, not health. Exclude historical-only
// records; a recent catalog refresh does not imply a recent field observation.
// ID_ARBRE is reused for five nearby Celtis positions. Use feature OIDs rather
// than collapsing those distinct inventory points.
function botanicalName(value: string | null): string | undefined {
  if (!value) return;
  let name = value.replace(/×/g, ' x ').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  if (!name) return;
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Geneva botanical name: ${name}`);
  if (/^(?:Actinidia|Berberis|Buxus|Cotoneaster|Euonymus|Frangula|Hibiscus|Lonicera|Ribes|Rosa|Sambucus|Spiraea|Viburnum)\b/.test(name)) return;
  if (/^(?:Cornus (?:alba|sanguinea)|Prunus (?:laurocerasus|spinosa)|Ligustrum (?:ibota|ovalifolium|sinense|vulgare))\b/.test(name)) return;
  return name;
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://vector.sitg.ge.ch/arcgis/rest/services/SIPV_ICA_WEB_PUBLIC_TOT/MapServer/0',
    { where: "COMMUNE LIKE 'Genève%'", fields: 'OBJECTID,NOM_LATIN,STATUT',
      returnGeometry: true, verifyComplete: true });
  let ids = new Set<number>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    let p = row.attributes;
    assert(Number.isSafeInteger(p.OBJECTID) && !ids.has(p.OBJECTID), 'Invalid/repeated Geneva feature ID');
    ids.add(p.OBJECTID);
    assert(['Historique', 'Relevé', 'Positionné', 'Nommé'].includes(p.STATUT), 'Unexpected Geneva observation status');
    assert(p.NOM_LATIN === null || typeof p.NOM_LATIN === 'string');
    if (p.STATUT === 'Historique') continue;
    let name = botanicalName(p.NOM_LATIN);
    if (!name || !row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 46.16 && lat < 46.25 && lon > 6.08 && lon < 6.21);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'geneva_ch.json'), JSON.stringify(trees, null, 2));
  console.log(`geneva_ch: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
