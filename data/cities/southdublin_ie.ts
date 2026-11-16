#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: { ID: string | null; Species: string | null; Trunk_Type: string | null };
  geometry?: { x: number; y: number } | null;
}

interface CarbonTree {
  attributes: { TreeID: string | null; Count_: number | null };
  geometry?: { x: number; y: number } | null;
}

export function treeSite(row: Tree, supplement?: { x: number; y: number } | null) {
  let name = row.attributes.Species?.trim();
  if (!name || /^(?:mixed\b|fruit tree mix\b|hedgerow\b|(?:g\.\s*)?shrubbery\b|unknown\b|unidentified\b)/i.test(name)) return;
  if (row.attributes.Trunk_Type?.trim() === 'Group') return;
  let geometry = row.geometry ?? supplement;
  if (!geometry) return;
  let { x: lon, y: lat } = geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 53.2 && lat < 53.4 && lon > -6.6 && lon < -6.2);
  return { name, lat, lon };
}

// Recover missing positions by stable ID from the council's 2024 carbon map, not from carbon estimates.
// Prefer current survey positions and exclude ambiguous IDs and older multi-tree locations.
export function treeSites(rows: Tree[], carbon: CarbonTree[]) {
  let surveyIDs = new Map<string, number>();
  for (let row of rows) {
    let id = row.attributes.ID?.trim().replace(/^ID\s+/, '');
    if (id) surveyIDs.set(id, (surveyIDs.get(id) ?? 0) + 1);
  }
  let carbonIDs = new Map<string, CarbonTree | null>();
  for (let row of carbon) {
    let id = row.attributes.TreeID?.trim();
    if (id) carbonIDs.set(id, carbonIDs.has(id) ? null : row);
  }
  let trees: { name: string; lat: number; lon: number }[] = [];
  let supplemented = 0;
  for (let row of rows) {
    let id = row.attributes.ID?.trim().replace(/^ID\s+/, '');
    let match = id && surveyIDs.get(id) === 1 ? carbonIDs.get(id) : undefined;
    let supplement = match?.attributes.Count_ === 1 ? match.geometry : undefined;
    let tree = treeSite(row, supplement);
    if (tree) {
      trees.push(tree);
      if (!row.geometry) supplemented++;
    }
  }
  return { trees, supplemented };
}

// The original 2022 service now hosts TreeDataSurvey2026SDCC; this is not a survey date for every tree.
async function main() {
  const endpoint = 'https://services1.arcgis.com/PxbTDTskGHCe4sv6/arcgis/rest/services/Tree_Data_Survey_Oct_2022_SDCC/FeatureServer/0';
  const rows: Tree[] = await CityUtil.fetchArcGis(endpoint, {
    fields: 'OBJECTID,ID,Species,Trunk_Type',
    returnGeometry: true,
    verifyComplete: true
  });
  const carbon: CarbonTree[] = await CityUtil.fetchArcGis(
    'https://services1.arcgis.com/PxbTDTskGHCe4sv6/arcgis/rest/services/TreeCarbon/FeatureServer/0', {
    fields: 'OBJECTID,TreeID,Count_',
    returnGeometry: true,
    verifyComplete: true
  });
  const { trees, supplemented } = treeSites(rows, carbon);
  assert(trees.length > 0);

  fs.writeFileSync(path.join(__dirname, 'southdublin_ie.json'), JSON.stringify(trees, null, 2));
  console.log(`southdublin_ie: ${trees.length} trees from ${rows.length} records; ${supplemented} positions recovered by TreeID; ${rows.length - trees.length} omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
