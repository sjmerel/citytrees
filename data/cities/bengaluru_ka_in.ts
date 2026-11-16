#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { CityUtil } from './city_util';

interface Tree {
  type: string;
  properties: { OBJECTID: number; TreeName: string | null; KGISTreeID: string | null };
  geometry: { type: string; coordinates: number[] } | null;
}

// January 2026 OpenCity snapshot, covering 144 historical wards, not the whole metro.
// OpenCity's download returns 403; this mirror preserves its public-domain-labelled archive.
// The underlying municipal rights are not independently confirmed. Status is undocumented,
// not assumed to be a tree-health indicator. Retain co-located records for process.ts.
const archiveUrl = 'https://raw.githubusercontent.com/skthewimp/bengaluru-tree-census-data/main/data/raw/2026-01/bbmp-tree-census-jan-2026.zip';

export function treeSite(row: Tree) {
  assert.equal(row.type, 'Feature');
  let p = row.properties;
  if (/loadtesting/i.test(p.KGISTreeID ?? '')) return;
  let name = p.TreeName?.replace(/\s+/g, ' ').trim();
  if (!name || /^Others$/i.test(name)) return;
  if (/^(?:Bambusa|Bougainvillea|Dendrocalamus|Musa|Nerium|Ravenala)\b/i.test(name) ||
      /^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(row.geometry);
  assert.equal(row.geometry.type, 'Point');
  let [lon, lat] = row.geometry.coordinates;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 12.8 && lat < 13.2 && lon > 77.4 && lon < 77.85);
  return { lat, lon, name };
}

async function main() {
  let directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bengaluru-trees-'));
  let archive = path.join(directory, 'trees.zip');
  let member = 'bbmp_tree_census_jan2026.geojson';
  let geojson = path.join(directory, member);
  try {
    if (process.argv[2]) fs.copyFileSync(path.resolve(process.argv[2]), archive);
    else {
      console.log(`Downloading January 2026 snapshot from ${archiveUrl}`);
      let response = await CityUtil.getWithRetry(archiveUrl, { responseType: 'arraybuffer', timeout: 240000 });
      fs.writeFileSync(archive, response.data);
    }
    execFileSync('unzip', ['-q', archive, member, '-d', directory], { timeout: 120000 });
    let trees: { lat: number; lon: number; name: string }[] = [];
    let ids = new Set<number>();
    let header = false;
    let footer = false;
    // The 239 MB export has one feature per line; avoid loading the entire collection.
    let lines = readline.createInterface({ input: fs.createReadStream(geojson), crlfDelay: Infinity });
    for await (let line of lines) {
      line = line.trim();
      if (!line) continue;
      if (!header) {
        assert.equal(line, '{"type":"FeatureCollection","features":[');
        header = true;
      }
      else if (line === ']}') {
        assert(!footer);
        footer = true;
      }
      else {
        assert(!footer);
        let row: Tree = JSON.parse(line.replace(/,$/, ''));
        let id = row.properties.OBJECTID;
        assert(Number.isSafeInteger(id) && !ids.has(id), 'Invalid/repeated Bengaluru tree ID');
        ids.add(id);
        let tree = treeSite(row);
        if (tree) trees.push(tree);
      }
    }
    assert(header && footer, 'Incomplete Bengaluru GeoJSON');
    assert.equal(ids.size, 702109, 'Unexpected January 2026 snapshot record count');
    assert(trees.length > 500000, 'Unexpectedly few Bengaluru trees');
    fs.writeFileSync(path.join(__dirname, 'bengaluru_ka_in.json'), JSON.stringify(trees));
    console.log(`bengaluru_ka_in: ${trees.length} trees; ${ids.size - trees.length} records omitted`);
  }
  finally {
    for (let file of [geojson, archive]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(directory);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
