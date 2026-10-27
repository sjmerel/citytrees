#!/usr/bin/env npx tsx

import axios from 'axios';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface Tree {
  globalid: string;
  latitude: number;
  longitude: number;
  sharedFields: {
    Botanical: string;
    Status: number;
    'Tree Condition': string | null;
  };
}

// Official 2021 survey, with subsequent updates, linked by:
// https://www.lexingtonma.gov/879/Lexington-Tree-Inventory
// Use the current public ArborPro share rather than the older ArcGIS snapshot.
async function main() {
  let trees: Tree[] | undefined;
  for (let attempt = 0; attempt < 5; ++attempt) {
    let response = await axios.post('https://supernova.arborprousa.com/api/communityviewer/features', {
      shareCode: 'egOvI4qQPQJElNw0', accessCode: ''
    }, { timeout: 120000 });
    if (response.status === 202) {
      console.log('ArborPro is preparing the public map; retrying in 5 seconds');
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }
    assert.equal(response.status, 200);
    assert.equal(response.data.name, 'Town of Lexington - Town Trees');
    trees = response.data.sharedItems.legacy_tree;
    assert(Array.isArray(trees) && trees.length > 0);
    break;
  }
  if (!trees) throw new Error('ArborPro public map was not ready after five requests');

  let ids = new Set<string>();
  for (let tree of trees) {
    assert(typeof tree.globalid === 'string' && !ids.has(tree.globalid));
    ids.add(tree.globalid);
    assert(typeof tree.sharedFields.Botanical === 'string');
    assert([1, 2, 3, 4].includes(tree.sharedFields.Status));
  }
  // Status 1 is active; 2/3/4 include stumps, vacancies and inactive sites.
  let sites = trees
    .filter(o => o.sharedFields.Status === 1 &&
      !/^(Dead|Removed|Stump|Inactive|Vacancy)$/i.test(o.sharedFields['Tree Condition'] ?? ''))
    .filter(o => o.latitude > 42.4 && o.latitude < 42.5 &&
      o.longitude > -71.3 && o.longitude < -71.17)
    .map(o => ({
      lat: o.latitude, lon: o.longitude,
      name: o.sharedFields.Botanical.replace(/\s+/g, ' ').trim()
    }))
    .filter(o => o.name && !/^(Snag|Inactive Tree|Other Tree|Stump|Vacant Planting Site.*)$/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'lexington_ma_us.json'), JSON.stringify(sites, null, 2));
  console.log(`lexington_ma_us: ${sites.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
