#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  objectid: number;
  boomsoort: string | null;
  eindbeeld: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Gemeente Eindhoven, Bomen; the portal explicitly says "Publiek domein",
// without a license URL. This is not an assertion of CC0.
// https://data.eindhoven.nl/explore/dataset/bomen/
// Municipal-managed trees, with some protected private trees; woods usually
// omitted. Includes the Eindhoven-Helmond canal corridor east of the city centre.
// November 2026 processing is not a survey date. Protection status is not a
// living/removal status. Conservatively exclude Ecoboom (possible habitat snags),
// Gerooid (removed) and Haag (hedges), but keep pollarded/trained living trees.
// boomsoort_varieteit is omitted: Geen/Onbekend/<macro:leeg> are placeholders.
async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Tree>(
    'https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/bomen');
  let ids = new Set<number>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    assert(Number.isSafeInteger(row.objectid) && !ids.has(row.objectid), 'Invalid/repeated Eindhoven tree ID');
    ids.add(row.objectid);
    assert(row.boomsoort === null || typeof row.boomsoort === 'string');
    if (['Gerooid', 'Ecoboom', 'Haag'].includes(row.eindbeeld ?? '')) continue;
    let name = row.boomsoort?.replace(/\s+/g, ' ').trim();
    if (!name || name === 'Onbekend') continue;
    assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Eindhoven botanical name: ${name}`);
    if (name === 'Prunus fruticosa') continue;
    // These labels name cultivars/selection groups, not species.
    if (/^(?:Prunus (?:accolade|kursar|pandora)|Ulmus resista|Populus astria)$/.test(name)) {
      name = name.split(' ')[0];
    }
    name = name.replace(/^(Tilia cordata) böhlje$/, '$1');
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 51.39 && lat < 51.51 && lon > 5.34 && lon < 5.69);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'eindhoven_nl.json'), JSON.stringify(trees, null, 2));
  console.log(`eindhoven_nl: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
