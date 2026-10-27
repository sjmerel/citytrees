#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { x: number; y: number } | null;
  attributes: {
    OBJECTID: number;
    GRIB_ID: number;
    Boomnummer: number;
    Wetenschap: string | null;
  };
}

// Gemeente Utrecht, Bomenkaart 2026; CC BY 4.0 explicitly in municipal catalog:
// https://open.utrecht.nl/dataset/utrecht-geo-bomenkaart-2026/utrecht-geo-bomenkaart-2026
// Attribute Gemeente Utrecht and indicate filtering/name processing.
// Individual municipal park/street and woodland-planting trees, not a complete
// private/forest census. Both GRIB_ID and Boomnummer are distinct across layers
// in the October 2026 snapshot. No health/removal field; vacant/stump notes
// sometimes replace botanical names. Snapshot dates are not inspections.
async function main() {
  let endpoint = 'https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/bomenkaart_2026/FeatureServer';
  let sites = new Map<number, string>();
  let trees = [];
  let total = 0;
  for (let layer of [0, 1]) {
    let rows: Feature[] = await CityUtil.fetchArcGis(`${endpoint}/${layer}`, {
      fields: 'OBJECTID,GRIB_ID,Boomnummer,Wetenschap', returnGeometry: true, verifyComplete: true
    });
    total += rows.length;
    for (let row of rows) {
      let p = row.attributes;
      assert(Number.isSafeInteger(p.GRIB_ID) && Number.isSafeInteger(p.Boomnummer));
      let identity = JSON.stringify([p.Boomnummer, p.Wetenschap, row.geometry?.x, row.geometry?.y]);
      let previous = sites.get(p.GRIB_ID);
      if (previous !== undefined) {
        assert.equal(previous, identity, 'Conflicting Utrecht asset across layers');
        continue;
      }
      sites.set(p.GRIB_ID, identity);
      assert(p.Wetenschap === null || typeof p.Wetenschap === 'string');
      let name = p.Wetenschap?.replace(/\s+/g, ' ').trim();
      if (!name || /^(?:N\.v\.t\.|Niet\b.*|Onbekend|Boom\b.*|Ecologisch\b.*|Geen\b.*|Ruwe iep|Lirio|stobbe\b.*|vervangen\b.*)$/i.test(name)) continue;
      if (/^(?:Actinidia|Chaenomeles|Pyracantha)\b/.test(name)) continue;
      if (/^(?:Cornus sanguinea|Elaeagnus umbellata|Ligustrum vulgare|Prunus glandulosa|Salix aurita)\b/.test(name)) continue;
      name = name.replace(/\s+(?:cv\.?|cultivars|hybride)$/, '');
      if (!row.geometry) continue;
      let { x: lon, y: lat } = row.geometry;
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 52.02 && lat < 52.15 && lon > 4.96 && lon < 5.21);
      trees.push({ lat, lon, name });
    }
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'utrecht_nl.json'), JSON.stringify(trees, null, 2));
  console.log(`utrecht_nl: ${trees.length} trees; ${total - trees.length} sites/overlaps omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
