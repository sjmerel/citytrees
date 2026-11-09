#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { x: number; y: number } | null;
  attributes: {
    Objectid: number;
    Gattung_beschrieb: string | null;
    Typ_beschrieb: string;
  };
}

// Geoinformation Stadt Bern, Baumkataster:
// https://opendata.swiss/en/dataset/baumkataster1
// Resources declare https://opendata.swiss/en/terms-of-use#terms_open:
// commercial/noncommercial reuse allowed; source recommended, NOT CC0.
// Municipal tree inventory, not complete forest/private coverage.
// Art_beschrieb is German, not a Latin epithet: use the published genus only.
// Strip cultivar/group descriptors, but leave spelling to canonicalization.
// Objectid is unique; Nummer repeats and objekt_ref groups multiple trees.
// Typ describes tree category, not health/removal. No living-status field.
// Letzte_Aenderung and catalog dates are edits, not individual surveys.
export function treeName(p: Feature['attributes']): string | null {
  assert(p.Gattung_beschrieb === null || typeof p.Gattung_beschrieb === 'string');
  assert(['Laubbaum', 'Nadelbaum', 'Obstbaum', 'unbekannt'].includes(p.Typ_beschrieb),
    `Unexpected Bern tree type: ${p.Typ_beschrieb}`);
  let name = p.Gattung_beschrieb?.trim();
  if (!name || p.Typ_beschrieb === 'unbekannt') return null;
  if (/^(?:Mirabelle|Reineclaude) Kultursorte$/.test(name)) return null;
  name = name.replace(/(?:,? Kultursorte|-Soulangiana-Hybriden|-Hybriden)$/, '');
  assert(/^(?:x )?[A-Z][a-z]+$/.test(name), `Unexpected Bern genus: ${name}`);
  if (name === 'Buxus') return null;
  return name;
}

async function main() {
  let rows: Feature[] = await CityUtil.fetchArcGis(
    'https://map.bern.ch/arcgis/rest/services/Geoportal/Baumkataster/MapServer/0',
    { fields: 'Objectid,Gattung_beschrieb,Typ_beschrieb', returnGeometry: true, verifyComplete: true });
  let trees = [];
  let excluded: Record<string, number> = { botanical: 0, missing_geometry: 0 };
  for (let row of rows) {
    if (row.geometry) {
      let { x: lon, y: lat } = row.geometry;
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 46.90 && lat < 47.00 && lon > 7.30 && lon < 7.51);
    }
    let name = treeName(row.attributes);
    if (!name) { ++excluded.botanical; continue; }
    if (!row.geometry) { ++excluded.missing_geometry; continue; }
    let { x: lon, y: lat } = row.geometry;
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'bern_ch.json'), JSON.stringify(trees, null, 2));
  console.log(`bern_ch: ${trees.length} trees; ${rows.length} source rows; exclusions ${JSON.stringify(excluded)}`);
}

if (require.main === module) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
