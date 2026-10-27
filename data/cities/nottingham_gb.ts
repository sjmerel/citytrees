#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Nottingham City Council maintained trees, inspected in the field, OGL v3.
// https://www.arcgis.com/home/item.html?id=854f59402043403eabce650cc7ab1150
// Nottingham City Council. Contains OS data (c) Crown copyright and database right.
// Created_Date is the export date, not the inspection date. No health field.
// Use transformed geometry: source attributes Lat/Long are mislabeled/swapped.
async function main() {
  let endpoint = 'https://services.arcgis.com/yvqphKcf9bBSnjX1/arcgis/rest/services/Trees__NCC_Maintained_/FeatureServer/63';
  let countResponse = (await axios.get(`${endpoint}/query`, {
    params: { f: 'json', where: '1=1', returnCountOnly: true }, timeout: 60000
  })).data;
  if (countResponse.error) throw new Error(`Nottingham count failed: ${JSON.stringify(countResponse.error)}`);
  assert(Number.isInteger(countResponse.count) && countResponse.count > 0);
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,Tree_ID,Species,Age', returnGeometry: true
  });
  assert.equal(rows.length, countResponse.count, 'Incomplete Nottingham inventory');
  let ids = new Set<string>();
  let trees = [];
  for (let row of rows) {
    let a = row.attributes;
    assert(typeof a.Tree_ID === 'string' && a.Tree_ID.trim() && !ids.has(a.Tree_ID), 'Repeated Nottingham tree ID');
    ids.add(a.Tree_ID);
    assert(a.Species === null || typeof a.Species === 'string');
    let name = a.Species?.replace(/\s+/g, ' ').trim();
    if (!name || /^(?:!|unknown\b|no species\b|mixed\b|rejected\b|dead$|Bramley$)/i.test(name)) continue;
    if (/^(?:stump|new location|tree pit exists|unused)$/i.test(a.Age?.trim() ?? '')) continue;
    if (/^(?:Hedera\b|Cornus alba$)/i.test(name)) continue;
    if (!row.geometry) continue;
    let lat = row.geometry.y, lon = row.geometry.x;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 52.85 && lat < 53.05 && lon > -1.3 && lon < -1);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'nottingham_gb.json'), JSON.stringify(trees, null, 2));
  console.log(`nottingham_gb: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
