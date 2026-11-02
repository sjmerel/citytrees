#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPointShapefile } from './shapefile_util';

const endpoint = 'https://data.gov.au/data/dataset/d17c9e50-fab1-40e6-b91d-6e665faf2656/resource/b3f01081-924c-41b7-989a-cf521ca136ea/download/cogb-environment-trees.shz';

// City of Greater Bendigo street and park trees, November 2024, CC BY 2.5 Australia.
// https://data.gov.au/data/dataset/city-of-greater-bendigo-environment-trees
// The Species field contains botanical names followed by common names; coordinates are WGS84.
async function main() {
  let trees: { name: string; lat: number; lon: number }[] = [];
  let counts = await readPointShapefile(endpoint, 'greaterbendigo', (row, lon, lat) => {
    assert(typeof row.Species === 'string');
    let species = row.Species.trim().replace(/\s+/g, ' ');
    if (!species || /^(?:not specified|unknown|unidentified|vacant)\b/i.test(species)) return;
    let match = species.match(/^(?:(?:[xX×]\s+)?[A-Z][A-Za-z-]+\s+(?:[xX×]\s+)?[a-z][A-Za-z-]+|[xX×]\s+[a-z][A-Za-z-]+\s+[a-z][A-Za-z-]+)(?:\s+(?:subsp\.?|ssp\.?|var\.?|f\.?)\s+[a-z][A-Za-z-]*)?/);
    let name = match?.[0].trim();
    if (!name) {
      let genus = row.Genus.trim().split(/\s+/)[0];
      if (!/^[A-Z][a-z-]+$/.test(genus)) return;
      name = genus;
    }
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > -37.1 && lat < -36.4 && lon > 144.0 && lon < 144.9);
    trees.push({ name, lat, lon });
  });
  assert.equal(counts.projection.includes('GCS_WGS_1984'), true);
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'greaterbendigo_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(`greaterbendigo_vic_au: ${trees.length} trees from ${counts.sourceCount} sites; ${counts.sourceCount - trees.length} omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
