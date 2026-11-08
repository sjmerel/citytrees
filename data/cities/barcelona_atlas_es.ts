#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Geometry {
  _id: number;
  geom_fid: string;
  geom_wgs84: string;
}

interface Relation {
  _id: number;
  geom_fid: string;
  especie_id: string;
}

interface Species {
  _id: number;
  especie_id: string;
  nom_ctf: string | null;
}

// Ajuntament de Barcelona, Biodiversity Atlas; CC BY 4.0.
// https://opendata-ajuntament.barcelona.cat/data/en/dataset/atles-biodiversitat-arbrat-geometries
// https://opendata-ajuntament.barcelona.cat/data/en/dataset/atles-biodiversitat-arbrat-rel-geometria-especie
// https://opendata-ajuntament.barcelona.cat/data/en/dataset/atles-biodiversitat-arbrat-especies
// https://creativecommons.org/licenses/by/4.0/
// Includes street and park trees, overlapping the separate barcelona_es park inventory.
// Match that source's seven-decimal coordinates so process.ts can deduplicate overlap.
// Bulk downloads return 403; these three resources are available in the CKAN datastore.
async function main() {
  let endpoint = 'https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search';
  async function getRows<T extends { _id: number }>(resourceId: string, label: string) {
    async function getPage(offset: number, limit: number) {
      let response = await CityUtil.getWithRetry(endpoint, {
        params: { resource_id: resourceId, limit, offset, sort: '_id asc' }, timeout: 60000
      });
      let result: { total: number; records: T[] } = response.data.result;
      assert(response.data.success && result && Number.isSafeInteger(result.total));
      assert(Array.isArray(result.records));
      return result;
    }
    let first = await getPage(0, 1);
    assert(first.total > 0);
    let rows: T[] = [];
    let ids = new Set<number>();
    for (let offset = 0; offset < first.total; offset += 10000) {
      let page = await getPage(offset, 10000);
      assert.equal(page.total, first.total, `${label} changed during download; retry`);
      assert.equal(page.records.length, Math.min(10000, first.total - offset),
        `Incomplete ${label} page`);
      for (let row of page.records) {
        assert(Number.isSafeInteger(row._id) && !ids.has(row._id),
          `Invalid/repeated ${label} row ID`);
        ids.add(row._id);
      }
      rows.push(...page.records);
      console.log(`${label}: ${rows.length}/${first.total}`);
    }
    assert.equal(rows.length, first.total);
    assert.equal((await getPage(0, 1)).total, first.total,
      `${label} changed during download; retry`);
    return rows;
  }

  let geometries = await getRows<Geometry>('7c64504a-a718-48fe-b466-8c93a160b0dd', 'Atlas geometries');
  let relations = await getRows<Relation>('506c3c5d-8f9b-409d-ae96-c0912da4a505', 'Atlas relationships');
  let species = await getRows<Species>('c654c488-2822-4e51-ad9b-f443989a4b41', 'Atlas species');
  let names = new Map<string, string | null>();
  for (let row of species) {
    assert(typeof row.especie_id === 'string' && /^\d+$/.test(row.especie_id));
    assert(!names.has(row.especie_id), 'Repeated Atlas species ID');
    assert(row.nom_ctf === null || typeof row.nom_ctf === 'string');
    names.set(row.especie_id, row.nom_ctf?.trim().replace(/\s+/g, ' ') ?? null);
  }
  let speciesByGeometry = new Map<string, string>();
  for (let row of relations) {
    assert(typeof row.geom_fid === 'string' && /^\d+$/.test(row.geom_fid));
    assert(typeof row.especie_id === 'string' && names.has(row.especie_id),
      'Atlas relationship references an unknown species');
    assert(!speciesByGeometry.has(row.geom_fid), 'Repeated Atlas geometry relationship');
    speciesByGeometry.set(row.geom_fid, row.especie_id);
  }
  assert.equal(geometries.length, relations.length, 'Atlas geometry/relationship count mismatch');
  let ids = new Set<string>();
  let trees = [];
  let omitted = 0;
  for (let row of geometries) {
    assert(typeof row.geom_fid === 'string' && /^\d+$/.test(row.geom_fid));
    assert(!ids.has(row.geom_fid), 'Repeated Atlas geometry ID');
    ids.add(row.geom_fid);
    let speciesId = speciesByGeometry.get(row.geom_fid);
    assert(speciesId !== undefined, 'Atlas geometry has no species relationship');
    let name = names.get(speciesId);
    if (!name || /^(?:-|n\.?c\.?|no informat|desconegut)$/i.test(name)) {
      ++omitted;
      continue;
    }
    assert(typeof row.geom_wgs84 === 'string');
    let point = /^POINT\s*\(\s*([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s*\)$/.exec(row.geom_wgs84);
    assert(point, 'Invalid Atlas point geometry');
    let lon = Number(point[1]), lat = Number(point[2]);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 41.3 && lat < 41.5 && lon > 2.0 && lon < 2.3,
      'Atlas coordinate outside Barcelona');
    trees.push({ lat: Number(lat.toFixed(7)), lon: Number(lon.toFixed(7)), name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'barcelona_atlas_es.json'), JSON.stringify(trees, null, 2));
  console.log(`barcelona_atlas_es: ${trees.length} trees; ${omitted} unidentified sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
