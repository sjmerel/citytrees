#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface Feature {
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: {
    gisid: string;
    pitid: string | null;
    art_bot: string | null;
    gattung: string | null;
    art_gruppe: string | null;
  };
}

// Official street trees and individually recorded park trees, not forest stands.
// https://gdi.berlin.de/geonetwork/srv/api/records/3368004a-d596-336a-8fdf-c4391f3313dd
// Datenlizenz Deutschland Zero 2.0: https://www.govdata.de/dl-de/zero-2-0
// April 2026 metadata revision is not a survey date. No condition/removal field
// is published. PITID identifies a tree/site citywide, including across layers.
async function main() {
  let trees = new Map<string, { lat: number; lon: number; name: string }>();
  let overlap = 0;
  for (let layer of ['strassenbaeume', 'anlagenbaeume']) {
    let ids = new Set<string>();
    let offset = 0;
    let total: number | undefined;
    for (;;) {
      let response = await axios.get('https://gdi.berlin.de/services/wfs/baumbestand', {
        params: {
          service: 'WFS', version: '2.0.0', request: 'GetFeature',
          typeNames: `baumbestand:${layer}`, outputFormat: 'application/json',
          srsName: 'urn:ogc:def:crs:OGC:1.3:CRS84',
          sortBy: 'gisid', count: 10000, startIndex: offset
        },
        timeout: 120000
      });
      let page: { type: string; numberMatched: number; features: Feature[] } = response.data;
      assert.equal(page.type, 'FeatureCollection');
      assert(Number.isInteger(page.numberMatched) && Array.isArray(page.features));
      total ??= page.numberMatched;
      assert.equal(page.numberMatched, total, 'Berlin inventory changed during download; retry');
      for (let feature of page.features) {
        let p = feature.properties;
        assert(typeof p.gisid === 'string' && !ids.has(p.gisid), 'Repeated Berlin WFS ID');
        ids.add(p.gisid);
        if (!feature.geometry) continue;
        assert.equal(feature.geometry.type, 'Point');
        let [lon, lat] = feature.geometry.coordinates;
        assert(Number.isFinite(lat) && Number.isFinite(lon));
        if (lat < 52.3 || lat > 52.7 || lon < 13.05 || lon > 13.8) continue;
        if (/^(?:Gro\u00dfstr\u00e4ucher|Str\u00e4ucher)$/i.test(p.art_gruppe ?? '')) continue;
        let name = p.art_bot?.replace(/\s+/g, ' ').trim() || p.gattung?.trim();
        if (!name || /^(?:unbekannt|unbestimmt|sonstige.*|stubben|stumpf|baum|leer.*|unknown)$/i.test(name)) continue;
        assert(typeof p.pitid === 'string' && p.pitid.length > 0);
        if (trees.has(p.pitid)) {
          ++overlap;
          continue;
        }
        trees.set(p.pitid, { lat, lon, name });
      }
      offset += page.features.length;
      console.log(`${layer}: ${offset}/${total}`);
      assert(offset <= total);
      if (offset === total) break;
      assert(page.features.length > 0, 'Incomplete Berlin WFS download');
    }
  }
  assert(trees.size > 0);
  fs.writeFileSync(path.join(__dirname, 'berlin_de.json'), JSON.stringify([...trees.values()], null, 2));
  console.log(`berlin_de: ${trees.size} trees; ${overlap} overlapping site IDs omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
