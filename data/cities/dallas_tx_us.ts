#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Municipal inventory linked by https://dallascityhall.com/projects/forestry/Pages/Inventory.aspx
// Partial DRG/Trees2024 and Tree Sites inventories, including street trees.
// The project owner confirms permission to use and redistribute these sources.
// Smart Tree Inventory remains excluded pending collection-method/overlap checks.
// DRG has no public condition/dates; Tree Sites exposes Alive/Dead/Removed/Stump.
interface Tree {
  lat: number;
  lon: number;
  name: string;
}

interface Observation extends Tree {
  retain: boolean;
}

export function mergeInventories(existing: Tree[], additional: Observation[]) {
  let rows: Observation[] = [...existing.map(row => ({ ...row, retain: true })), ...additional];
  let parents = Uint32Array.from(rows, (_, i) => i);
  let buckets = new Map<string, number[]>();
  let longitudeScale = 111320 * Math.cos(32.8 * Math.PI / 180);
  function root(i: number): number {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  }
  // Different GPS observations can differ by submeter amounts. Reconcile only
  // groups touched by Tree Sites; leave unrelated existing DRG sites unchanged.
  for (let i = 0; i < rows.length; ++i) {
    let row = rows[i];
    let x = Math.floor(row.lon * longitudeScale);
    let y = Math.floor(row.lat * 111320);
    if (i >= existing.length) {
      for (let dx = -1; dx <= 1; ++dx) {
        for (let dy = -1; dy <= 1; ++dy) {
          for (let j of buckets.get(`${x + dx},${y + dy}`) ?? []) {
            let other = rows[j];
            if (Math.hypot((row.lon - other.lon) * longitudeScale, (row.lat - other.lat) * 111320) <= 1) {
              parents[root(i)] = root(j);
            }
          }
        }
      }
    }
    let key = `${x},${y}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(i);
  }
  let groups = new Map<number, { first: number; name: string; retain: boolean; count: number }>();
  for (let i = 0; i < rows.length; ++i) {
    let row = rows[i];
    let id = root(i);
    let group = groups.get(id);
    if (group) {
      ++group.count;
      if (!row.retain || row.name !== group.name) group.retain = false;
    }
    else {
      groups.set(id, { first: i, name: row.name, retain: row.retain, count: 1 });
    }
  }
  let trees: Tree[] = [];
  let duplicates = 0;
  let excluded = 0;
  for (let group of groups.values()) {
    if (!group.retain) {
      excluded += group.count;
      continue;
    }
    let { lat, lon, name } = rows[group.first];
    trees.push({ lat, lon, name });
    duplicates += group.count - 1;
  }
  assert.equal(trees.length + duplicates + excluded, rows.length);
  return { trees, duplicates, excluded };
}

async function main() {
  let rows = await CityUtil.fetchTreeKeeper(
    'https://dallastx.treekeepersoftware.com', 'DallasTX_Trees2024', 5,
    'https://geocom3.daveytreekeeper.com/geoserver/Treekeeper/ows',
    { coordinatesFromGrid: true });

  let existing = rows
    .filter(o => o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
      o.lat > 32.6 && o.lat < 33.05 && o.lon > -97.05 && o.lon < -96.45)
    .filter(o => o.name && !/^(Unknown(?: .*)?|Unassigned|Z Add \d+)$/i.test(o.name))
    .map(o => ({ lat: o.lat, lon: o.lon, name: o.name }));

  let sites = await CityUtil.fetchTreeKeeper(
    'https://dallastx.treekeepersoftware.com', 'DallasTX_TreeSites', 1,
    'https://geocom3.daveytreekeeper.com/geoserver/Treekeeper/ows',
    { coordinatesFromGrid: true });
  let additional = sites
    .filter(o => o.lat > 32.6 && o.lat < 33.05 && o.lon > -97.05 && o.lon < -96.45)
    .map(o => {
      assert(typeof o.attributes.SITE_ATTR24 === 'string', 'Missing Dallas Tree Sites status');
      return {
        lat: o.lat, lon: o.lon, name: o.name,
        retain: o.attributes.SITE_ACTIVE === 1 && ['Tree', 'Palm'].includes(o.speciesType) &&
          o.attributes.SITE_ATTR24 === 'Alive' && !!o.name &&
          !/^(Unknown(?: .*)?|Unassigned|Z Add \d+)$/i.test(o.name)
      };
    });
  assert(additional.some(row => row.retain), 'Dallas Tree Sites contains no eligible living trees');
  let { trees, duplicates, excluded } = mergeInventories(existing, additional);
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'dallas_tx_us.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({
    city: 'dallas_tx_us', drg_count: existing.length, tree_sites_count: additional.length,
    final_count: trees.length, duplicates, excluded
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
