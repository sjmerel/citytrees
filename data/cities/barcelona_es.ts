#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface Tree {
  _id: number;
  cat_nom_cientific: string | null;
  tipus_element: string;
  latitud: string | null;
  longitud: string | null;
}

// Ajuntament de Barcelona, Arbrat de parcs; CC BY 4.0.
// https://opendata-ajuntament.barcelona.cat/data/en/dataset/arbrat-parcs
// https://creativecommons.org/licenses/by/4.0/
// Attribute the Ajuntament de Barcelona. This is park-tree coverage only;
// the companion street/zone inventory bulk resources currently return 403.
async function main() {
  let endpoint = 'https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search';
  let resourceId = '23076aaa-4f0e-4045-b4e5-61d5e651b5a6';
  async function getPage(offset: number, limit: number) {
    let response = await axios.get(endpoint, {
      params: { resource_id: resourceId, limit, offset }, timeout: 60000
    });
    let result = response.data.result;
    assert(response.data.success && result && Number.isSafeInteger(result.total));
    assert(Array.isArray(result.records));
    return result as { total: number; records: Tree[] };
  }
  let first = await getPage(0, 1);
  assert(first.total > 0);
  let rows: Tree[] = [];
  for (let offset = 0; offset < first.total; offset += 1000) {
    let page = await getPage(offset, 1000);
    assert.equal(page.total, first.total, 'Barcelona park inventory changed during download');
    assert(page.records.length > 0 && page.records.length <= 1000);
    rows.push(...page.records);
    console.log(`arbrat-parcs: ${rows.length}/${first.total}`);
  }
  assert.equal(rows.length, first.total, 'Incomplete Barcelona park inventory');
  assert.equal((await getPage(0, 1)).total, first.total,
    'Barcelona park inventory changed during download; retry');
  let ids = new Set<number>();
  let trees = [];
  let omitted = 0;
  for (let row of rows) {
    assert(Number.isSafeInteger(row._id) && !ids.has(row._id), 'Invalid/repeated Barcelona row ID');
    ids.add(row._id);
    assert(typeof row.tipus_element === 'string');
    if (row.tipus_element !== 'ARBRE PARC') {
      ++omitted;
      continue;
    }
    assert(row.cat_nom_cientific === null || typeof row.cat_nom_cientific === 'string');
    let name = row.cat_nom_cientific?.trim().replace(/\s+/g, ' ');
    if (!name || /^(?:-|n\.?c\.?|no informat|desconegut)$/i.test(name)) {
      ++omitted;
      continue;
    }
    assert(typeof row.latitud === 'string' && typeof row.longitud === 'string');
    let lat = Number(row.latitud), lon = Number(row.longitud);
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 41.3 && lat < 41.5 && lon > 2.0 && lon < 2.3,
      'Barcelona coordinate outside the city');
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'barcelona_es.json'), JSON.stringify(trees, null, 2));
  console.log(`barcelona_es: ${trees.length} park trees; ${omitted} non-tree/unidentified sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
