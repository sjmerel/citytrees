#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: {
    Botanischer_Name: string | null;
    Anordnung: string | null;
  };
}

// Stadt Koeln, daily municipal Baumkataster; DL-DE-Zero 2.0:
// https://offenedaten-koeln.de/dataset/baumkataster-koeln-fortlaufend-aktualisiert
// Individually managed street/facility/park trees, not a complete city census.
// No removal/inspection date is exposed; Pflanzjahr is a planting year.
// GeoJSON stays in EPSG:25832 even when WGS84 is requested; reproject explicitly.
// Baumnummer is missing/repeated, so verify the full export against WFS counts
// rather than using this display number as a unique ID. Omit woodland stands.
async function main() {
  let endpoint = 'https://geoportal.stadt-koeln.de/wss/service/baumkataster_extern_wfs/guest';
  let params = { service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'ms:baumkataster' };
  async function getCount() {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: { ...params, resultType: 'hits' }, responseType: 'text', timeout: 120000
    });
    let match = response.data.match(/\bnumberMatched="(\d+)"/);
    assert(match, 'Cologne WFS did not return a total');
    let count = Number(match[1]);
    assert(Number.isSafeInteger(count) && count > 0);
    return count;
  }
  let total = await getCount();
  let response = await CityUtil.getWithRetry(endpoint, {
    params: {
      ...params, outputFormat: 'application/json; subtype=geojson',
      srsName: 'EPSG:25832', count: total
    },
    timeout: 240000
  });
  let collection: { type: string; features: Feature[] } = response.data;
  assert.equal(collection.type, 'FeatureCollection');
  assert(Array.isArray(collection.features));
  assert.equal(collection.features.length, total, 'Incomplete Cologne export');
  assert.equal(await getCount(), total, 'Cologne inventory changed during download; retry');
  let projection = '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs';
  let trees = [];
  for (let row of collection.features) {
    assert(row.properties.Botanischer_Name === null || typeof row.properties.Botanischer_Name === 'string');
    assert(row.properties.Anordnung === null || typeof row.properties.Anordnung === 'string');
    if (row.properties.Anordnung === 'waldartiger Bestand') continue;
    let name = row.properties.Botanischer_Name?.replace(/\s+/g, ' ').trim();
    if (!name || /^(?:unbekannt|Verschiedene)$/i.test(name)) continue;
    if (/^(?:Buxus|Caragana|Cephalanthus|Fontanesia|Hamamelis|Lindera|Rhamnus|Sinowilsonia|Viburnum|Zanthoxylum)\b/.test(name)) continue;
    if (/^(?:Aesculus parviflora|Alangium platanifolium|Alnus viridis|Betula fruticosa|Cornus sanguinea|Prunus spinosa)\b/.test(name)) continue;
    assert(/^[A-Z][a-z]+(?: |$)/.test(name), `Unexpected Cologne botanical name: ${name}`);
    if (!row.geometry) continue;
    assert.equal(row.geometry.type, 'Point');
    assert.equal(row.geometry.coordinates.length, 2);
    let [x, y] = row.geometry.coordinates;
    assert(Number.isFinite(x) && Number.isFinite(y));
    assert(x > 340000 && x < 380000 && y > 5620000 && y < 5670000);
    let [lon, lat] = proj4(projection, 'EPSG:4326', [x, y]);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 50.8 && lat < 51.15 && lon > 6.75 && lon < 7.2);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'cologne_de.json'), JSON.stringify(trees, null, 2));
  console.log(`cologne_de: ${trees.length} trees; ${total - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
