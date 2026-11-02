#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';
import { readPointShapefile } from './shapefile_util';

const GDA94 = '+proj=longlat +ellps=GRS80 +no_defs';

const sources = [
  {
    url: 'https://data.gov.au/data/dataset/f918f178-90f5-4c9d-b15a-9447301a381e/resource/0072de55-3e43-4d0e-9a5e-7a9449b828fc/download/brimbank-street-trees.zip',
    prefix: 'brimbank-street',
    type: 'TR-Street Tree'
  },
  {
    url: 'https://data.gov.au/data/dataset/7a57b5a1-2ca3-4171-be91-0d371cefd250/resource/0df2776c-4432-4dcc-9cfd-1ea3efad2cfc/download/brimbank-open-space-trees.zip',
    prefix: 'brimbank-open',
    type: 'TR-Open Space Tree'
  }
];

// Brimbank City Council street and open-space trees, March 2019, CC BY 2.5 Australia.
// https://data.gov.au/data/dataset/brimbank-street-trees
// https://data.gov.au/data/dataset/brimbank-open-space-trees
// Both shapefiles are GDA94 geographic coordinates. Exclude removed trees and planting plans.
function scientificName(genus: string, species: string): string {
  if (!genus || /^(?:not specified|unknown|unidentified|palm)$/i.test(genus)) return '';
  species = species.trim().replace(/\s+/g, ' ');
  if (!species || /^(?:not specified|unknown|unidentified|sp\.?|spp\.?)$/i.test(species)) return genus;

  let taxon = species;
  if (new RegExp(`^${genus}\\s+`, 'i').test(species)) {
    taxon = species.slice(genus.length).trim();
    if (/^([xX×]\s+)?[a-z][A-Za-z-]*(?:\s+(?:subsp\.?|ssp\.?|var\.?|f\.?)\s+[a-z][A-Za-z-]*)?$/.test(taxon)) {
      return `${genus} ${taxon}`;
    }
    return genus;
  }
  if (/^([xX×]\s+)?[a-z][A-Za-z-]*(?:\s+(?:subsp\.?|ssp\.?|var\.?|f\.?)\s+[a-z][A-Za-z-]*)?$/.test(taxon)) {
    return `${genus} ${taxon}`;
  }
  return genus;
}

async function main() {
  let trees: { name: string; lat: number; lon: number }[] = [];
  let streetPoints = new Set<string>();
  let totalSites = 0;
  for (let [index, source] of sources.entries()) {
    let result = await readPointShapefile(source.url, source.prefix, (row, x, y) => {
      if (row.Status !== 'Existing' || row.Type !== source.type) return;
      let genus = row.Genus;
      let name = scientificName(genus, row.Species);
      if (!name) return;
      assert(Number.isFinite(x) && Number.isFinite(y));
      assert(y > -37.9 && y < -37.6 && x > 144.7 && x < 145.0);
      let key = `${x},${y}`;
      if (index === 0) streetPoints.add(key);
      else if (streetPoints.has(key)) return;
      let [lon, lat] = proj4(GDA94, 'WGS84', [x, y]);
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      trees.push({ name, lat, lon });
    });
    assert(result.projection.includes('GCS_GDA_1994'));
    totalSites += result.sourceCount;
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'brimbank_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(`brimbank_vic_au: ${trees.length} trees from ${totalSites} sites; ${totalSites - trees.length} omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
