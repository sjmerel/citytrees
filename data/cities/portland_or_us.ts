#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface ParkTree {
  attributes: {
    Genus_species: string | null;
    Condition: string | null;
  };
  geometry: { x: number; y: number } | null;
}

// Developed parks only; surveyed in 2017-2020, not a current natural-area census.
// Species contains codes; Genus_species supplies botanical names.
// No shared street/park IDs; proximity alone does not establish duplicate trees.
export function parkTrees(rows: ParkTree[]) {
  let trees: { name: string; lat: number; lon: number }[] = [];
  for (let row of rows) {
    if (row.attributes.Condition === 'Dead') continue;
    let name = row.attributes.Genus_species?.trim()
      .replace(/\s+syn\..*$/, '').replace(/\s+\(.*\)$/, '').replace(/\s+x$/, '').trim();
    if (!name || /^unknown$/i.test(name)) continue;
    assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Portland park botanical name: ${name}`);
    assert(row.geometry);
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 45.4 && lat < 45.7 && lon > -122.85 && lon < -122.45);
    trees.push({ name, lat, lon });
  }
  return trees;
}

async function main() {
  let endpoint = 'https://www.portlandmaps.com/od/rest/services/COP_OpenData_Environment/MapServer';
  let rows = await CityUtil.fetchArcGis(`${endpoint}/1415`, {
    fields: 'OBJECTID,SPECIES',
    where: 'SPECIES IS NOT NULL',
    returnGeometry: true,
    verifyComplete: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPECIES.split(' - ')[0].trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  let parks: ParkTree[] = await CityUtil.fetchArcGis(`${endpoint}/220`, {
    fields: 'OBJECTID,Genus_species,Condition',
    where: "Genus_species IS NOT NULL AND (Condition IS NULL OR Condition <> 'Dead')",
    returnGeometry: true,
    verifyComplete: true
  });
  let parkSites = parkTrees(parks);
  trees.push(...parkSites);

  fs.writeFileSync(path.join(__dirname, 'portland_or_us.json'), JSON.stringify(trees, null, 2));
  console.log(`portland_or_us: ${rows.length} street trees + ${parkSites.length} park trees; ${parks.length - parkSites.length} park records omitted`);
}


////////////////////////////////////////

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
