#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Use the licensed Heritage Trees release, not the separately restricted TreesSG inventory.
async function main() {
  const datasetId = 'd_644ff187b6d14d6316f47284a4a6c81f';
  const response = await CityUtil.getWithRetry(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`,
    { timeout: 60000 }
  );
  assert.equal(response.data.code, 0);
  const downloadUrl: unknown = response.data.data?.url;
  assert(typeof downloadUrl === 'string' && downloadUrl.startsWith('https://'));

  const download = await CityUtil.getWithRetry(downloadUrl, { timeout: 120000 });
  const collection = download.data;
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.name, 'HERITAGETREES');
  assert(Array.isArray(collection.features) && collection.features.length > 0);

  const ids = new Set<number>();
  const trees = collection.features.map((feature: any) => {
    const attributes = feature.properties;
    assert(Number.isSafeInteger(attributes.OBJECTID) && !ids.has(attributes.OBJECTID));
    ids.add(attributes.OBJECTID);

    const botanicalName = String(attributes.NAME).trim().match(
      /^([A-Z][\p{L}-]+(?:\s+(?:×\s+)?[a-z][\p{L}-]+)?(?:\s+(?:subsp\.|var\.|f\.)\s+[a-z][\p{L}-]+)?)/u
    );
    assert(botanicalName, `Unexpected Heritage Trees name: ${attributes.NAME}`);
    assert.equal(feature.geometry.type, 'Point');
    const [lon, lat] = feature.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat >= 1 && lat <= 2 && lon >= 103 && lon <= 105);

    return { name: botanicalName[1], lat, lon };
  });

  fs.writeFileSync(path.join(__dirname, 'singapore_sg.json'), JSON.stringify(trees, null, 2));
  console.log(`singapore_sg: ${trees.length} Heritage Trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
