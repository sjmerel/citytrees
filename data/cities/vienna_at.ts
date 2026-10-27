#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface Feature {
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    BAUM_ID: number;
    GATTUNG_ART: string | null;
    GEBIETSGRUPPE: string | null;
  };
}

// Stadt Wien, municipal street/park/facility trees, not a census of all forests
// or private trees; includes nearby Purkersdorf waterworks facilities.
// CC BY 3.0 Austria, as specified in the WFS capabilities:
// https://data.wien.gv.at/daten/geo?service=WFS&version=2.0.0&request=GetCapabilities
// GATTUNG_ART appends a German common name in parentheses. PFLANZJAHR is the
// planting year; no individual inspection date or health/removal field is open.
async function main() {
  let endpoint = 'https://data.wien.gv.at/daten/geo';
  let ids = new Set<number>();
  let trees = [];
  let offset = 0;
  let total: number | undefined;
  for (;;) {
    let response = await axios.get(endpoint, {
      params: {
        service: 'WFS', version: '2.0.0', request: 'GetFeature',
        typeNames: 'ogdwien:BAUMKATOGD', outputFormat: 'application/json',
        srsName: 'urn:ogc:def:crs:OGC:1.3:CRS84',
        sortBy: 'BAUM_ID', count: 10000, startIndex: offset
      },
      timeout: 120000
    });
    let page: { type: string; numberMatched: number; features: Feature[] } = response.data;
    assert.equal(page.type, 'FeatureCollection');
    assert(Number.isInteger(page.numberMatched) && Array.isArray(page.features));
    total ??= page.numberMatched;
    assert.equal(page.numberMatched, total, 'Vienna inventory changed during download; retry');
    for (let feature of page.features) {
      let p = feature.properties;
      assert(Number.isInteger(p.BAUM_ID) && !ids.has(p.BAUM_ID), 'Repeated Vienna tree ID');
      ids.add(p.BAUM_ID);
      assert(p.GATTUNG_ART === null || typeof p.GATTUNG_ART === 'string');
      let name = p.GATTUNG_ART?.split(' (')[0].replace(/\s+/g, ' ').trim();
      if (!name || /^(?:Baumgruppe|Obstbaum|Jungbaum wird gepflanzt|unbekannt|Laubbaum|nicht bekannt)$/i.test(name)) continue;
      if (/^(?:Test|Projekte in Bau)$/.test(p.GEBIETSGRUPPE ?? '')) continue;
      if (/^(?:Aesculus parviflora|Cornus sanguinea)$/.test(name)) continue;
      name = name.replace(/ spec\.$/, '');
      if (!feature.geometry) continue;
      assert.equal(feature.geometry.type, 'Point');
      let [lon, lat] = feature.geometry.coordinates;
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 48.1 && lat < 48.4 && lon > 16.1 && lon < 16.6);
      trees.push({ lat, lon, name });
    }
    offset += page.features.length;
    console.log(`vienna_at: ${offset}/${total}`);
    assert(offset <= total);
    if (offset === total) break;
    assert(page.features.length > 0, 'Incomplete Vienna WFS download');
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'vienna_at.json'), JSON.stringify(trees, null, 2));
  console.log(`vienna_at: ${trees.length} trees; ${offset - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
