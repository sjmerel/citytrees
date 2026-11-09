#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Category {
  id: string;
  hungarian: string;
  latin: string;
}

export interface Tree {
  lat: number;
  lon: number;
  storeNumber: number;
  supplyId: string;
}

interface Batch {
  category: Category;
  rows: Tree[];
}

interface Detail {
  id: string;
  dataOwner: string;
  dataVariant: number;
  treeCategory: Category;
  height: number;
  trunkDiameter: number;
}

// PARTIAL COVERAGE: only BP Fatár store 1, a FŐKERT-managed inventory subset.
// Other FŐKERT stores (2/3) and all district-owned inventories are excluded.
// https://fokert.budapestikozmuvek.hu/a-bp-fatar-alkalmazas
// BY PERMISSION from the project owner; no published open reuse licence verified.
// Downstream reuse requires separate permission, not merely public map access.
//
// The frontend uses /api/tree/supplies/categories for its Latin-name search,
// and /supplies/{storeNumber}/{supplyId} for individual tree inventory details.
// The dictionary has no owner field. Its compatibility with store 1 is checked
// against a FŐKERT-owned detail for EVERY populated category, not assumed.
// Identical category IDs have incompatible names in other stores (e.g. store 7
// calls 000066100 Eriobotrya japonica, whereas this dictionary says Carpinus).
// Names from those stores must never be assigned using this dictionary.
//
// This is the complete stable named-category subset of store 1, not a citywide
// tree count or all FŐKERT trees. The publisher's "over 138,000" is not an API
// count. Street searches also expose "Kiszáradt fa" (dead trees), absent from
// the named dictionary. Details expose state through treeCategory, with no
// separate living-status field. No parks, woods or group polygons are queried.
const baseUrl = 'https://infogardenweb.hu/bpfatar/api/tree/supplies/';

async function mapPolite<T, U>(items: T[], action: (item: T) => Promise<U>): Promise<U[]> {
  let next = 0;
  let results = new Array<U>(items.length);
  // Wait for every worker even on failure, so no requests outlive the importer.
  let workers = await Promise.allSettled(Array.from({ length: 4 }, async () => {
    while (next < items.length) {
      let i = next++;
      results[i] = await action(items[i]!);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }));
  for (let worker of workers) {
    if (worker.status === 'rejected') throw worker.reason;
  }
  return results;
}

function checkCategory(category: Category) {
  assert(category && typeof category === 'object');
  assert(typeof category.id === 'string' && category.id.length > 0);
  assert(typeof category.hungarian === 'string' && category.hungarian.length > 0);
  assert(typeof category.latin === 'string' && category.latin.length > 0);
}

export function treeKey(row: Tree): string {
  assert(Number.isSafeInteger(row.storeNumber) && row.storeNumber > 0);
  assert(typeof row.supplyId === 'string' && row.supplyId.length > 0);
  return JSON.stringify([row.storeNumber, row.supplyId]);
}

export function checkTree(row: Tree) {
  treeKey(row);
  assert(Number.isFinite(row.lat) && Number.isFinite(row.lon));
  assert(row.lat > 47.35 && row.lat < 47.65 && row.lon > 18.90 && row.lon < 19.35,
    `Non-Budapest coordinate: ${treeKey(row)}`);
}

export function treeName(value: string): { name: string | null; exclusion: string | null } {
  assert(typeof value === 'string');
  let name = value.replace(/\s+/g, ' ').trim();
  if (!name || /^(?:Kiszáradt fa|Tuskó|Tusko|Facsonk|Ismeretlen|Unknown|Unidentified|Dead|Stump)(?:\s|$)/i.test(name)) {
    return { name: null, exclusion: 'dead_stump_unknown' };
  }
  // Conservative exclusions of shrub taxa/cultivars, even in a tree inventory.
  // Retain grafted Prunus fruticosa 'Globosa' standards, not the bare shrub.
  if (/^(?:Buxus|Cotinus|Euonymus|Exochorda|Fontanesia|Frangula|Hibiscus|Hippophaë|Lonicera|Philadelphus|Pyracantha|Sambucus|Tamarix|Vitex)(?:\s|$)/.test(name) ||
      /^(?:Aesculus parviflora|Cornus sanguinea|Corylus avellana|Elaeagnus umbellata|Juniperus (?:communis|horizontalis|sabina|[×x] media)|Ligustrum (?:ovalifolium|vulgare)|Pinus mugo|Poncirus trifoliata|Prunus (?:laurocerasus|spinosa|triloba)|Rhamnus cathartica|Robinia hispida|Salix integra|Syringa vulgaris|Zanthoxyllum piperitum)\b/.test(name) ||
      /^Prunus fruticosa$/.test(name) ||
      /^Juniperus virginiana 'Tripartita'/.test(name) ||
      /^Taxus baccata 'Repandens'/.test(name)) {
    return { name: null, exclusion: 'shrub' };
  }
  // Keep source spellings for shared canonicalization; only remove formatting,
  // cultivar descriptors, unspecified-species suffixes and explicit authors.
  name = name.replace(/\s+['‘’"].*$/, '').replace(/\s+(?:sp|spp)\.?$/, '');
  name = name.replace(/\s+(?:Borbás|Kárpáti)$/, '').replace(/×/g, 'x').replace(/\s+x$/, '');
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Budapest botanical name: ${name}`);
  return { name, exclusion: null };
}

async function fetchCategories(): Promise<Category[]> {
  let categories: Category[] = (await CityUtil.getWithRetry(
    `${baseUrl}categories`, { timeout: 120000 })).data;
  assert(Array.isArray(categories) && categories.length > 0);
  let ids = new Set<string>();
  for (let category of categories) {
    checkCategory(category);
    assert(!ids.has(category.id), 'Duplicate Budapest category ID');
    ids.add(category.id);
  }
  return categories.sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchBatches(categories: Category[]): Promise<Batch[]> {
  let batches = await mapPolite(categories, async category => {
    let rows: Tree[] = (await CityUtil.getWithRetry(`${baseUrl}clusterdata`, {
      params: { categoryId: category.id }, timeout: 120000
    })).data;
    assert(Array.isArray(rows), 'Incomplete Budapest category response');
    for (let row of rows) checkTree(row);
    return { category, rows };
  });
  let ids = new Set<string>();
  for (let batch of batches) {
    for (let row of batch.rows) {
      let key = treeKey(row);
      assert(!ids.has(key), `Duplicate/conflicting Budapest category membership: ${key}`);
      ids.add(key);
    }
  }
  return batches;
}

async function checkDetail(category: Category, row: Tree) {
  assert.equal(row.storeNumber, 1);
  let detail: Detail = (await CityUtil.getWithRetry(
    `${baseUrl}1/${encodeURIComponent(row.supplyId)}`, { timeout: 60000 })).data;
  assert.equal(detail.id, row.supplyId);
  assert.equal(detail.dataOwner, 'FŐKERT');
  assert.equal(detail.dataVariant, 0);
  assert.deepEqual(detail.treeCategory, category, `Store-1 botanical conflict: ${treeKey(row)}`);
  assert(Number.isFinite(detail.height) && detail.height > 0);
  // Zero diameter is a published measurement (e.g. a 0.5 m Juniperus), not
  // a removal flag. Dead trees have their own non-botanical treeCategory.
  assert(Number.isFinite(detail.trunkDiameter) && detail.trunkDiameter >= 0);
  return { categoryId: category.id, supplyId: row.supplyId, dataOwner: detail.dataOwner };
}

export async function main() {
  let categories = await fetchCategories();
  let names = new Map(categories.map(category => [category.id, treeName(category.latin)]));
  let batches = await fetchBatches(categories);
  let scoped = batches.map(batch => ({
    category: batch.category, rows: batch.rows.filter(row => row.storeNumber === 1)
  }));
  let populated = scoped.filter(batch => batch.rows.length > 0);
  assert(populated.length > 0);
  let detailChecks = await mapPolite(populated, batch => checkDetail(batch.category, batch.rows[0]!));
  let extraChecks: { category: Category; row: Tree }[] = [];
  for (let batch of [...populated].sort((a, b) => b.rows.length - a.rows.length).slice(0, 4)) {
    extraChecks.push({ category: batch.category, row: batch.rows[Math.floor(batch.rows.length / 2)]! });
    extraChecks.push({ category: batch.category, row: batch.rows[batch.rows.length - 1]! });
  }
  await mapPolite(extraChecks, sample => checkDetail(sample.category, sample.row));

  let repeated = await fetchBatches(categories);
  for (let i = 0; i < scoped.length; ++i) {
    let signature = (rows: Tree[]) => rows.map(row =>
      JSON.stringify([treeKey(row), row.lat, row.lon])).sort();
    assert.deepEqual(signature(repeated[i]!.rows.filter(row => row.storeNumber === 1)),
      signature(scoped[i]!.rows), `Store-1 category changed during download: ${categories[i]!.id}; retry`);
  }
  assert.deepEqual(await fetchCategories(), categories, 'Budapest dictionary changed during download; retry');

  let trees: { lat: number; lon: number; name: string }[] = [];
  let exclusions: Record<string, number> = { other_stores: 0, shrub: 0, dead_stump_unknown: 0 };
  let distribution = [];
  for (let batch of batches) {
    let rows = batch.rows.filter(row => row.storeNumber === 1);
    exclusions.other_stores += batch.rows.length - rows.length;
    let { name, exclusion } = names.get(batch.category.id)!;
    distribution.push({ ...batch.category, source1_rows: rows.length, name, exclusion });
    if (exclusion) { exclusions[exclusion] += rows.length; continue; }
    assert(name);
    for (let { lat, lon } of rows) trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'budapest_hu.json'), JSON.stringify(trees, null, 2));
  let result = {
    output_tree_count: trees.length,
    source1_rows: scoped.reduce((n, batch) => n + batch.rows.length, 0),
    category_union_rows: batches.reduce((n, batch) => n + batch.rows.length, 0),
    categories: categories.length,
    populated_source1_categories: populated.length,
    detail_checks: detailChecks.length + extraChecks.length,
    exclusions,
    category_distribution: distribution,
    verification: 'Every populated store-1 category matched a FŐKERT-owned named detail; extra members matched; complete store-1 IDs/coordinates in every category and dictionary identical before/after.'
  };
  console.log(`budapest_hu: ${trees.length} trees, FŐKERT store 1 ONLY; exclusions ${JSON.stringify(exclusions)}`);
  return result;
}

if (require.main === module) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
