#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: number[][] } | null;
  properties: {
    baumid: number;
    gattung_latein: string | null;
    art_latein: string | null;
    sorte_latein?: string | null;
  };
}

// Public street parcels, including Hamburg Port Authority; not park/private trees.
// Datenlizenz Deutschland Namensnennung 2.0: https://www.govdata.de/dl-de/by-2-0
// Source: Freie und Hansestadt Hamburg, Behoerde fuer Umwelt, Klima, Energie
// und Agrarwirtschaft. https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster
// Annual January snapshot (current data year 2026), not an individual survey date.
// No health/removal field is published. Each MultiPoint contains one tree.
async function main() {
  let endpoint = 'https://geodienste.hamburg.de/HH_WFS_Strassenbaumkataster';
  let params = {
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'de.hh.up:strassenbaumkataster'
  };
  async function getCount() {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: { ...params, resultType: 'hits' }, responseType: 'text', timeout: 120000
    });
    let match = response.data.match(/\bnumberMatched="(\d+)"/);
    assert(match, 'Hamburg WFS did not return a total');
    let count = Number(match[1]);
    assert(Number.isSafeInteger(count) && count > 0);
    return count;
  }
  let total = await getCount();
  let ids = new Set<number>();
  let trees = [];
  let offset = 0;
  while (offset < total) {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: {
        ...params, outputFormat: 'application/geo+json', srsName: 'EPSG:4326',
        sortBy: 'baumid', count: 10000, startIndex: offset
      },
      timeout: 120000
    });
    let page: { type: string; features: Feature[] } = response.data;
    assert.equal(page.type, 'FeatureCollection');
    assert(Array.isArray(page.features) && page.features.length > 0, 'Incomplete Hamburg WFS download');
    for (let feature of page.features) {
      let p = feature.properties;
      assert(Number.isInteger(p.baumid) && !ids.has(p.baumid), 'Repeated Hamburg tree ID');
      ids.add(p.baumid);
      assert(p.art_latein === null || typeof p.art_latein === 'string');
      assert(p.sorte_latein == null || typeof p.sorte_latein === 'string');
      assert(p.gattung_latein === null || typeof p.gattung_latein === 'string');
      let name = p.sorte_latein?.trim() || p.art_latein?.trim() || p.gattung_latein?.trim();
      if (!name || name === 'Mischbestand') continue;
      name = name.replace(/\s+/g, ' ').replace(/ spec\.?$/, '').replace(/\s+\([sv]\)/g, '').replace(/ veredlung\b/i, '').trim();
      if (!feature.geometry) continue;
      assert.equal(feature.geometry.type, 'MultiPoint');
      assert.equal(feature.geometry.coordinates.length, 1, 'Hamburg feature is not an individual tree');
      let [lon, lat] = feature.geometry.coordinates[0];
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      assert(lat > 53.35 && lat < 53.8 && lon > 9.65 && lon < 10.4);
      trees.push({ lat, lon, name });
    }
    offset += page.features.length;
    console.log(`hamburg_de: ${offset}/${total}`);
    assert(offset <= total);
  }
  assert.equal(await getCount(), total, 'Hamburg inventory changed during download; retry');
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'hamburg_de.json'), JSON.stringify(trees, null, 2));
  console.log(`hamburg_de: ${trees.length} trees; ${offset - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
