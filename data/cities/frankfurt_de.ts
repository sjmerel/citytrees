#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { x: number; y: number } | null;
  attributes: {
    OBJECTID: number;
    Lateinischer_Name: string | null;
  };
}

// Stadt Frankfurt am Main, Gruenflaechenamt; dl-de/by-2-0:
// https://www.govdata.de/dl-de/by-2-0
// Primary municipal metadata confirms the license and attribution:
// https://geodatenkatalog.frankfurt.de/geonetwork/srv/api/records/63f13573-4b0c-4692-8f20-0b40b0320184/formatters/xml
// Esri Deutschland republication of municipal CSV, projected to WGS84:
// https://www.arcgis.com/home/item.html?id=8c50110f190e43599baf50701aaff13a
// February 2025 snapshot, NOT the item's 2026 edit date; partial municipal
// streets/parks/facilities, not the complete >200k managed inventory.
// Attribute Stadt Frankfurt am Main, www.frankfurt.de; indicate processing.
// No health/removal or inspection date. Exclude woodland stands and shrubs.
// The scientific field includes common names and dash-delimited cultivars.
async function main() {
  let rows: Feature[] = await CityUtil.fetchArcGis(
    'https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/FFM_Baumkataster/FeatureServer/0',
    { fields: 'OBJECTID,Lateinischer_Name', returnGeometry: true, verifyComplete: true });
  let trees = [];
  for (let row of rows) {
    let p = row.attributes;
    assert(p.Lateinischer_Name === null || typeof p.Lateinischer_Name === 'string');
    let name = p.Lateinischer_Name?.split(',')[0].replace(/^ZO_/, '').replace(/\s+/g, ' ').trim();
    if (!name || /^waldartiger Bestand$/i.test(name)) continue;
    let cultivar = name.match(/ -(.+?)-(?=\s|$)/);
    if (cultivar) {
      name = name.slice(0, cultivar.index).replace(/ x$/, '') + ` '${cultivar[1].replace(/["']/g, '')}'`;
    }
    name = name.replace(/ Bastard-Zypresse$/, '').replace(/^Malus Hybriden in Sorten$/, 'Malus');
    if (/^(?:Berberis|Hamamelis|Hibiscus|Lonicera|Lunicera|Musa|Rosa|Viburnum)\b/.test(name)) continue;
    if (/^(?:Alnus viridis|Cornus (?:alba|sanguinea)|Prunus fruticosa|Salix gracilistyla)\b/.test(name)) continue;
    if (!row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 50.03 && lat < 50.25 && lon > 8.45 && lon < 8.85);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'frankfurt_de.json'), JSON.stringify(trees, null, 2));
  console.log(`frankfurt_de: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
