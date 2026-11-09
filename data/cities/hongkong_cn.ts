#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  attributes: {
    Department_Tree_ID: string;
    TMCP_Tree_ID: string;
    Tree_Speices: string | null;
  };
  geometry: { x: number; y: number } | null;
}

interface HousingFeature {
  attributes: {
    ETrMS_ID: string;
    TMCP_ID: string;
    Species_EN: string | null;
  };
  geometry: Feature['geometry'];
}

// DSD properties and Housing Authority trees with trunks over 500mm DBH only.
// DATA.GOV.HK/CSDI terms permit redistribution with attribution.
// https://data.gov.hk/en-data/dataset/hk-dsd-dsd_psi_1-tree-dsd
// https://data.gov.hk/en-data/dataset/hk-housing-lt-lt
// Neither source publishes a removal flag; DSD Triage_Color is not mortality.
export function botanicalName(value: string | null): string | undefined {
  assert(value === null || typeof value === 'string');
  let name = value?.replace(/\s+/g, ' ').trim()
    .replace(/\s+\(syn\.[^)]*\)/g, '').replace(/\s+spp?\.?$/i, '').trim();
  if (!name) return;
  assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Hong Kong botanical name: ${name}`);
  if (/^(?:Bougainvillea|Ravenala|Aglaia odorata|Ligustrum sinense|Viburnum odoratissimum)\b/.test(name)) return;
  return name;
}

async function main() {
  let rows: Feature[] = await CityUtil.fetchArcGis(
    'https://portal.csdi.gov.hk/server/rest/services/common/dsd_rcd_1728458555477_44280/FeatureServer/0',
    { fields: 'OBJECTID,Department_Tree_ID,TMCP_Tree_ID,Tree_Speices',
      returnGeometry: true, verifyComplete: true });
  let dsdCount = rows.length;
  let housing: HousingFeature[] = await CityUtil.fetchArcGis(
    'https://portal.csdi.gov.hk/server/rest/services/common/housingauthority_rcd_1788331402958_44090/FeatureServer/0',
    { fields: 'OBJECTID,ETrMS_ID,TMCP_ID,Species_EN', returnGeometry: true, verifyComplete: true });
  // The agencies use different ID schemes; keep both identifiers source-scoped.
  for (let row of housing) {
    assert(typeof row.attributes.ETrMS_ID === 'string' && row.attributes.ETrMS_ID.length > 0);
    assert(typeof row.attributes.TMCP_ID === 'string' && row.attributes.TMCP_ID.length > 0);
    rows.push({
      attributes: {
        Department_Tree_ID: `HA:${row.attributes.ETrMS_ID}`,
        TMCP_Tree_ID: `HA:${row.attributes.TMCP_ID}`,
        Tree_Speices: row.attributes.Species_EN
      },
      geometry: row.geometry
    });
  }
  let ids = new Set<string>();
  let departmentIds = new Set<string>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    let p = row.attributes;
    assert(typeof p.TMCP_Tree_ID === 'string' && p.TMCP_Tree_ID.length > 0 && !ids.has(p.TMCP_Tree_ID),
      'Invalid/repeated Hong Kong tree ID');
    assert(typeof p.Department_Tree_ID === 'string' && p.Department_Tree_ID.length > 0 &&
      !departmentIds.has(p.Department_Tree_ID), 'Invalid/repeated Hong Kong department tree ID');
    ids.add(p.TMCP_Tree_ID);
    departmentIds.add(p.Department_Tree_ID);
    let name = botanicalName(p.Tree_Speices);
    if (!name || !row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 22.15 && lat < 22.60 && lon > 113.80 && lon < 114.45);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'hongkong_cn.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({
    city: 'hongkong_cn', dsd_count: dsdCount, housing_count: housing.length,
    final_count: trees.length, omitted: rows.length - trees.length
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
