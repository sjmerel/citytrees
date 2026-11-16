#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';
import { readPointShapefile } from './shapefile_util';

const endpoint = 'https://data.smartdublin.ie/dataset/9db57181-c6e7-4069-b9ec-d7d316ace784/resource/1ad731c9-4377-43c8-9d7f-942723a9e3cf/download/tree.shapefile.zip';
// No PRJ: EPSG:2157 coordinates agree with embedded Irish Grid references and named parks.
const ITM = '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

export function treeSite(row: Record<string, string>, x: number, y: number) {
  let name = row.Species.trim();
  if (!name || /^(?:unknown|unidentified|suitable planting location|(?:g\.\s*)?shrubbery)\b/i.test(name)) return;
  if (/^(?:dead|monolith|felled|fallen|stump)$/i.test(row.Condition.trim())) return;
  if (row.TrunkType.trim() === 'Group' || name.includes(',') || row.Count.includes(',') || Number(row.Count) > 1) return;
  // Count=0 also occurs on living, individually inventoried trees; use condition, not zero counts.
  assert(Number.isFinite(x) && Number.isFinite(y));
  assert(x > 700000 && x < 730000 && y > 720000 && y < 750000);
  let [lon, lat] = proj4(ITM, 'WGS84', [x, y]);
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 53.2 && lat < 53.45 && lon > -6.5 && lon < -6.05);
  return { name, lat, lon };
}

// April 2024 export, not a complete/current city census. Polygon/group records are not individual trees.
async function main() {
  let trees: { name: string; lat: number; lon: number }[] = [];
  let result = await readPointShapefile(endpoint, 'dublin', (row, x, y) => {
    let tree = treeSite(row, x, y);
    if (tree) trees.push(tree);
  }, {
    memberPattern: /pt\.(?:shp|dbf|prj)$/i,
    projectionIfMissing: ITM
  });
  assert.equal(result.projection, ITM);
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'dublin_ie.json'), JSON.stringify(trees, null, 2));
  console.log(`dublin_ie: ${trees.length} trees from ${result.sourceCount} point records; ${result.sourceCount - trees.length} omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
