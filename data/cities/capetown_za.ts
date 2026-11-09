#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  attributes: {
    SPCS: string | null;
    TREE_CNDT: string | null;
    STS: string | null;
    RMVL_DATE: number | null;
  };
  geometry: { x: number | 'NaN'; y: number | 'NaN' } | null;
}

// City of Cape Town, Polyphagous Shot Hole Borer Beetle (PSHB) Sightings.
// Small pest-survey subset, not a citywide inventory; most sightings are removed.
// The city's Open Data Policy permits use/sharing for any purpose.
// https://www.capetown.gov.za/general/city-of-cape-town-open-data-terms-of-use/
// Scheduled removal and branch dieback do not mean the tree is already dead.
export function botanicalName(value: string | null): string | undefined {
  assert(value === null || typeof value === 'string');
  let name = value?.replace(/×/g, ' x ').replace(/\s+/g, ' ').trim();
  if (!name || /^unknown\b/i.test(name)) return;
  if (/^(?:Dombeya burgessiae|Viburnum odoratissimum)$/i.test(name)) return;
  if (name === 'Ulmus americana/hollandica') return 'Ulmus';
  let corrections: Record<string, string> = {
    'Combretumm apiculatum': 'Combretum apiculatum',
    'Erynthrina caffra': 'Erythrina caffra',
    'Melaluca viminalis': 'Melaleuca viminalis',
    'Taxadium distichum': 'Taxodium distichum'
  };
  name = corrections[name] ?? name;
  name = name.replace(/^([A-Z][a-z]+) ([A-Z][a-z]+)$/, (_, genus: string, species: string) =>
    `${genus} ${species.toLowerCase()}`);
  assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Cape Town botanical name: ${name}`);
  return name;
}

export function isLiving(p: Feature['attributes']): boolean {
  assert(p.TREE_CNDT === null || typeof p.TREE_CNDT === 'string');
  assert(p.STS === null || typeof p.STS === 'string');
  return /^(?:healthy|branch die back|branch dead back)$/i.test(p.TREE_CNDT?.trim() ?? '') &&
    p.STS?.trim().toLowerCase() !== 'removed' && p.RMVL_DATE === null;
}

async function main() {
  let rows: Feature[] = await CityUtil.fetchArcGis(
    'https://esapqa.capetown.gov.za/agsext/rest/services/Theme_Based/ODP_SPLIT_10/FeatureServer/16',
    { fields: 'OBJECTID,SPCS,TREE_CNDT,STS,RMVL_DATE', returnGeometry: true, verifyComplete: true });
  let trees: { lat: number; lon: number; name: string }[] = [];
  let sites = new Map<string, { name: string; living: boolean }>();
  let exclusions = { nonliving: 0, unnamed_or_shrub: 0, missing_geometry: 0, duplicates: 0, conflicting_sites: 0 };
  // Inspect all sightings so an old living observation cannot revive a removed site.
  for (let row of rows) {
    if (!row.geometry || row.geometry.x === 'NaN' || row.geometry.y === 'NaN') continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > -34.40 && lat < -33.45 && lon > 18.25 && lon < 19.10);
    let key = JSON.stringify([lat, lon]);
    let living = isLiving(row.attributes);
    let name = living ? botanicalName(row.attributes.SPCS) ?? '' : '';
    let previous = sites.get(key);
    if (previous) {
      if (previous.name !== name || !living) previous.living = false;
    }
    else {
      sites.set(key, { name, living });
    }
  }
  let seen = new Set<string>();
  for (let row of rows) {
    if (!isLiving(row.attributes)) {
      ++exclusions.nonliving;
      continue;
    }
    let name = botanicalName(row.attributes.SPCS);
    if (!name) {
      ++exclusions.unnamed_or_shrub;
      continue;
    }
    if (!row.geometry || row.geometry.x === 'NaN' || row.geometry.y === 'NaN') {
      ++exclusions.missing_geometry;
      continue;
    }
    let { x: lon, y: lat } = row.geometry;
    let key = JSON.stringify([lat, lon]);
    if (!sites.get(key)!.living) {
      ++exclusions.conflicting_sites;
      continue;
    }
    if (seen.has(key)) {
      ++exclusions.duplicates;
      continue;
    }
    seen.add(key);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(exclusions).reduce((a, b) => a + b, 0), rows.length);
  fs.writeFileSync(path.join(__dirname, 'capetown_za.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({ city: 'capetown_za', source_count: rows.length, final_count: trees.length, exclusions }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
