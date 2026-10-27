#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Contains information licensed under the Open Government Licence - City of Welland.
// https://open-welland.hub.arcgis.com/pages/terms-of-use
// Partial City-owned inventory: positions from 2013 imagery, verified in field.
// Species contains common names, so publish genus only, without guessing epithets.
// Exclude two known genus/common-name contradictions rather than guessing a fix.
// Active-tree layer has no individual inspection dates or health/removal field.
async function main() {
  let endpoint = 'https://arcgisweb.welland.ca/serverprodpub/rest/services/OpenData/OPENDATA_Active_Trees/MapServer/0';
  let countResponse = (await axios.get(`${endpoint}/query`, {
    params: { f: 'json', where: '1=1', returnCountOnly: true }, timeout: 60000
  })).data;
  if (countResponse.error) throw new Error(`Welland count failed: ${JSON.stringify(countResponse.error)}`);
  assert(Number.isInteger(countResponse.count) && countResponse.count > 0);
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,Genus,Species', returnGeometry: true
  });
  assert.equal(rows.length, countResponse.count, 'Incomplete Welland inventory');
  let ids = new Set<number>();
  let trees = [];
  for (let row of rows) {
    let a = row.attributes;
    assert(Number.isInteger(a.OBJECTID) && !ids.has(a.OBJECTID), 'Repeated Welland object ID');
    ids.add(a.OBJECTID);
    assert(a.Genus === null || typeof a.Genus === 'string');
    let name = a.Genus?.trim();
    if (!name || !/^[A-Z][a-z]+$/.test(name) || name === 'Other') continue;
    if (name === 'Fraxinus' && a.Species === 'Ash - Mountain') continue;
    if (name === 'Castanea' && a.Species === 'Chestnut - Horse') continue;
    if (!row.geometry) continue;
    let lat = row.geometry.y, lon = row.geometry.x;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 42.85 && lat < 43.1 && lon > -79.4 && lon < -79.1);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'welland_on_ca.json'), JSON.stringify(trees, null, 2));
  console.log(`welland_on_ca: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
