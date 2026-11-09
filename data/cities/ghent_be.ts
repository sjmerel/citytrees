#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Site {
  gis_id: string | null;
  sortiment: string | null;
  beheerfase: string | null;
  plantwijze: string | null;
  boombeeld: string | null;
  bestemming: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
  geometry: {
    type: string;
    geometry: { type: string; coordinates: number[] } | null;
  } | null;
}

interface Tree {
  lat: number;
  lon: number;
  name: string;
}

// Groendienst Gent, Locaties bomen Gent; Modellicentie Gratis Hergebruik v1.0.
// https://data.stad.gent/explore/dataset/locaties-bomen-gent/
// Attribute Groendienst Gent and the source/date when possible. No additional
// attribution text is specified in the dataset metadata (attributions: null).
// The city warns this inventory is incomplete and refresh is paused during
// migration, with current data expected Q4 2026. Daily portal processing is
// not a survey date. Contains municipal and some third-party trees.
// Full lifecycle/planting distributions contain only living management stages
// and individual/row/group/wood planting, not removed or vacant positions.
// Keep living pollarded/trained/veteran trees; omit shrubs, unknown labels,
// family-level malformed labels and the eight sites without stable gis_id.
// Preserve species spellings/synonyms for the shared canonicalization pipeline.
export function botanicalName(value: string | null): string | null {
  assert(value === null || typeof value === 'string');
  let name = value?.replace(/[‘’“”"]/g, "'").replace(/\s+/g, ' ').trim();
  if (!name || /^Te Bepalen$/i.test(name)) return null;
  if (/^(?:Conaceae|Ulmaceae)\b/.test(name)) return null;
  let trailingHybrid = /\s+\(x\)$/i.test(name);
  name = name.replace(/\s+\(x\)$/i, '').replace(/\b[Xx]\b/g, '×');
  // A trailing "(x)" marks a hybrid, not a cultivar or synonym.
  if (trailingHybrid) {
    name = name.replace(/^([A-Z][a-z]+) /, '$1 × ');
  }
  name = name.replace(/^([A-Z][a-z]+) × (?=')/, '$1 ')
    .replace(/^([A-Z][a-z]+ [a-z]+)\.$/, '$1');
  assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Ghent botanical name: ${name}`);
  return name;
}

export function treeFromSite(row: Site): { tree: Tree | null; exclusion?: string } {
  for (let value of [row.beheerfase, row.plantwijze, row.boombeeld, row.bestemming]) {
    assert(value === null || typeof value === 'string');
  }
  if ([row.beheerfase, row.plantwijze, row.boombeeld, row.bestemming].some(value =>
    /^(?:dood|dode boom|gerooid|verwijderd|stobbe|stronk|lege (?:boom|plant)plaats|vacant|heester|struik)$/i.test(value ?? ''))) {
    return { tree: null, exclusion: 'nonliving_or_nontree' };
  }
  let name = botanicalName(row.sortiment);
  if (!name) return { tree: null, exclusion: 'unknown_or_malformed_name' };
  if (/^(?:Buxus|Euonymus|Frangula|Hamamelis|Ligustrum|Sambucus|Syringa|Viburnum)\b/.test(name) ||
    /^(?:Cornus sanguinea|Corylus avellana|Magnolia (?:liliflora|stellata)|Prunus (?:laurocerasus|spinosa)|Rhamnus frangula|Salix (?:cinerea|purpurea))\b/.test(name)) {
    return { tree: null, exclusion: 'shrub_taxon' };
  }
  let point = row.geo_point_2d;
  let geometry = row.geometry?.geometry;
  if (row.geometry) assert.equal(row.geometry.type, 'Feature');
  if (geometry) {
    assert.equal(geometry.type, 'Point');
    assert.equal(geometry.coordinates.length, 2);
    assert(geometry.coordinates.every(Number.isFinite));
    if (point) {
      assert(Math.abs(point.lon - geometry.coordinates[0]) < 0.000001);
      assert(Math.abs(point.lat - geometry.coordinates[1]) < 0.000001);
    }
    else point = { lon: geometry.coordinates[0], lat: geometry.coordinates[1] };
  }
  if (!point) return { tree: null, exclusion: 'missing_geometry' };
  let { lat, lon } = point;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 50.97 && lat < 51.17 && lon > 3.57 && lon < 3.86);
  return { tree: { lat, lon, name } };
}

async function main() {
  let rows = await CityUtil.fetchOpenDataSoft<Site>(
    'https://data.stad.gent/api/explore/v2.1/catalog/datasets/locaties-bomen-gent');
  let ids = new Set<string>();
  let trees: Tree[] = [];
  let exclusions: Record<string, number> = {};
  for (let row of rows) {
    assert(row.gis_id === null || (typeof row.gis_id === 'string' && row.gis_id.length > 0));
    let result: ReturnType<typeof treeFromSite>;
    if (row.gis_id === null) result = { tree: null, exclusion: 'missing_id' };
    else {
      assert(!ids.has(row.gis_id), 'Repeated Ghent tree ID');
      ids.add(row.gis_id);
      result = treeFromSite(row);
    }
    if (result.tree) trees.push(result.tree);
    else {
      assert(result.exclusion);
      exclusions[result.exclusion] = (exclusions[result.exclusion] ?? 0) + 1;
    }
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(exclusions).reduce((a, b) => a + b, 0), rows.length);
  fs.writeFileSync(path.join(__dirname, 'ghent_be.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({
    city: 'ghent_be', before: rows.length, after: rows.length,
    unique_ids: ids.size, final_count: trees.length, exclusions
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
