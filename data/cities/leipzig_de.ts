#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    objectid: number;
    ga_lang_wiss: string | null;
    gefaellt_am: string | null;
    nachpflanzung_geplant: string | null;
    baumhoehe: number | null;
    st_durchm: number | null;
    st_umfang: number | null;
  };
}

// Stadt Leipzig / Amt fuer Stadtgruen und Gewaesser, Baumkataster:
// https://opendata.leipzig.de/dataset/baumkataster-stadt-leipzig1
// Primary CKAN resource metadata explicitly licenses this WFS dl-de/by-2-0
// with attribution "Stadt Leipzig"; indicate filtering/name processing.
// https://opendata.leipzig.de/api/3/action/package_show?id=baumkataster-stadt-leipzig1
// https://www.govdata.de/dl-de/by-2-0
// Streets and municipal properties; incomplete citywide coverage. Group/stand
// labels and arboretum shrubs occur alongside individual trees.
// fme_tstamp is an export date, pflanzjahr planting, neither an inspection.
// Replacement notes can occur on measured existing trees; only omit unmeasured
// replacement sites, in addition to the explicit gefaellt_am removal field.
async function main() {
  let rows = await CityUtil.fetchWfs<Feature>(
    'https://geodienste.leipzig.de/l3/OpenData/wfs', 'OpenData:Baeume', 'objectid');
  let trees = [];
  for (let row of rows) {
    let p = row.properties;
    if (p.gefaellt_am) continue;
    if (p.nachpflanzung_geplant && !p.baumhoehe && !p.st_durchm && !p.st_umfang) continue;
    assert(p.ga_lang_wiss === null || typeof p.ga_lang_wiss === 'string');
    let name = p.ga_lang_wiss?.replace(/\s+/g, ' ').trim();
    if (!name || /^(?:nicht bestimmt|Bestandsfl\u00e4che|unbekannt|waldartiger Bestand|Unklar)$/i.test(name)) continue;
    if (/^(?:Hamamelis|Hibiscus|Lonicera|Pyracantha|Viburnum)\b/.test(name)) continue;
    if (/^Rhododendron\b/.test(name) && name !== 'Rhododendron arboreum') continue;
    if (/^(?:Aesculus parviflora|Cornus (?:alba|sanguinea)|Salix aurita)\b/.test(name)) continue;
    if (!row.geometry) continue;
    assert.equal(row.geometry.type, 'Point');
    assert.equal(row.geometry.coordinates.length, 2);
    let [lon, lat] = row.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 51.23 && lat < 51.46 && lon > 12.23 && lon < 12.55);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'leipzig_de.json'), JSON.stringify(trees, null, 2));
  console.log(`leipzig_de: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
