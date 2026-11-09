#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    OBJECTID: number;
    LATBOOMSOORT: string | null;
  };
  geometry: { x: number; y: number } | null;
}

// Stad Antwerpen, boom; Gratis Open Data Licentie 1.0.
// https://www.antwerpen.be/info/gratis-open-data-licentie
// Individually managed public trees; woodland groups are separate polygons.
// Initial mapping was supplemented with field-checked species and as-built
// updates. Catalog modification is not a new survey; no removal flag is exposed.
// GENUS is entirely null in the checked inventory, so cannot recover unknowns.
function botanicalName(value: string | null): string | undefined {
  if (!value) return;
  let name = value.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  name = name.replace(/\s+\(=.*\)$/, '');
  if (/\s+\(x C\)$/.test(name)) {
    name = 'x ' + name.replace(/\s+\(x C\)$/, '');
  }
  else if (/\s+\(x\)$/.test(name)) {
    name = name.replace(/\s+\(x\)$/, '').replace(/^([A-Z][a-z]+)\s+/, '$1 x ');
  }
  if (!name) return;
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Antwerp botanical name: ${name}`);
  if (/^(?:Actinidia|Berberis|Buxus|Decaisnea|Euonymus|Frangula|Hamamelis|Sambucus|Spiraea|Viburnum)\b/.test(name)) return;
  if (/^(?:Cornus (?:alba|sanguinea)|Clerodendrum ugandense|Prunus (?:laurocerasus|spinosa)|Ligustrum (?:ovalifolium|vulgare))\b/.test(name)) return;
  return name;
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek6/MapServer/676',
    { fields: 'OBJECTID,LATBOOMSOORT', returnGeometry: true, verifyComplete: true });
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    assert(row.attributes.LATBOOMSOORT === null || typeof row.attributes.LATBOOMSOORT === 'string');
    let name = botanicalName(row.attributes.LATBOOMSOORT);
    if (!name || !row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 51.10 && lat < 51.40 && lon > 4.14 && lon < 4.61);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'antwerp_be.json'), JSON.stringify(trees, null, 2));
  console.log(`antwerp_be: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
