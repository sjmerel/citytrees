#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  id: string;
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    id: number | null;
    uuid: string;
    traeart: string | null;
    slaegt: string | null;
    busk_trae: string | null;
    ny_dm_under_element: string | null;
    sundhed: string | null;
    driftstatus_gadetrae: string | null;
  };
}

interface Tree {
  lat: number;
  lon: number;
  name: string;
}

// Københavns Kommune, Træ basis (Kommunale træer); resource license CC_BY.
// The official dataset page's licenses mapping explicitly expands CC_BY to
// "Creative Commons Attribution 4.0 International" (not license_list).
// Credit the publisher, link CC BY 4.0, and indicate filtering/name processing.
// https://www.opendata.dk/city-of-copenhagen/trae-basis-kommunale-traeer
// Individual street/park/nature/cemetery trees, plus some private trees.
// Exclude shrubs and torso/habitat trunks; retain dying trees and "Fældes"
// (scheduled felling is not completed removal). Update dates are not surveys.
// properties.id has nulls/duplicates, and uuid also repeats. GeoJSON feature
// IDs are unique and repeatable in live requests. Use a complete bulk response
// instead of fetchWfs, which requires unique numeric properties IDs.
// slaegt contains Latin labels (including errors); slaegtsnavn is Danish.
// Only the verified Latin genera present on nameless rows are fallback names.
const fallbackGenera = new Set([
  'Abies', 'Acer', 'Aesculus', 'Alnus', 'Betula', 'Castanea', 'Cedrus',
  'Crataegus', 'Fagus', 'Fraxinus', 'Juglans', 'Larix', 'Malus', 'Picea',
  'Pinus', 'Platanus', 'Populus', 'Prunus', 'Quercus', 'Robinia', 'Salix',
  'Sorbus', 'Taxus', 'Thuja', 'Tilia'
]);

export function botanicalName(value: string | null, genus: string | null): string | null {
  assert(value === null || typeof value === 'string');
  assert(genus === null || typeof genus === 'string');
  let name = value?.replace(/[‘’“”"]/g, "'").replace(/\s+/g, ' ').trim();
  if (!name) {
    let candidate = genus?.trim().split(/\s+/)[0];
    return candidate && fallbackGenera.has(candidate) ? candidate : null;
  }
  // The source adds pronunciation accents to Latin, not just cultivar names.
  let quote = name.indexOf("'");
  let end = quote < 0 ? name.length : quote;
  name = name.slice(0, end).normalize('NFD').replace(/\p{M}/gu, '') + name.slice(end);
  name = name.replace(/\s+\((?:han|hun)\)$/i, '')
    .replace(/\bhybr(?:id)?\.?\s*/gi, '× ')
    .replace(/\b[Xx]\b/g, '×')
    .replace(/^([A-Z][a-z]+) ([a-z-]+) ×$/, '$1 × $2')
    .replace(/^([A-Z][a-z]+) × (?=')/, '$1 ')
    .replace(/\s+/g, ' ').trim();
  assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Copenhagen botanical name: ${name}`);
  return name;
}

export function treeFromFeature(row: Feature): { tree: Tree | null; exclusion?: string; fallback?: boolean } {
  let p = row.properties;
  for (let value of [p.busk_trae, p.ny_dm_under_element, p.sundhed, p.driftstatus_gadetrae]) {
    assert(value === null || typeof value === 'string');
  }
  if (p.busk_trae === 'Busk') return { tree: null, exclusion: 'shrub_flag' };
  if (p.ny_dm_under_element === 'Torso') return { tree: null, exclusion: 'torso' };
  if ([p.sundhed, p.driftstatus_gadetrae].some(value =>
    /^(?:død|dødt|fældet|fjernet|stub|tom planteplads)$/i.test(value ?? ''))) {
    return { tree: null, exclusion: 'nonliving_or_vacant' };
  }
  let name = botanicalName(p.traeart, p.slaegt);
  if (!name) return { tree: null, exclusion: 'unknown_name' };
  if (/^(?:Aronia|Buddleja|Buxus|Calycanthus|Colutea|Cotoneaster|Euonymus|Forthergilla|Frangula|Gaultheria|Hamamelis|Hibiscus|Hydrangea|Kerria|Kolkwitzia|Osmanthus|Phillyrea|Physocarbus|Rhododendron|Ribes|Rosa|Sambucus|Sambuscus|Sorbaria|Staphylea|Symphoricapos|Syringa|Viburnum)\b/.test(name) ||
    /^(?:Aesculus parviflora|Cornus sanguinea|Corylus (?:americana|avellana)|Cotinus coggygria|Ilex meserveae|Malus sargentii|Pinus mugo|Prunus spinosa|Salix (?:aurita|purpurea))\b/.test(name) ||
    name === "Picea glauca 'Conica'") return { tree: null, exclusion: 'shrub_taxon' };
  if (!row.geometry) return { tree: null, exclusion: 'missing_geometry' };
  assert.equal(row.geometry.type, 'Point');
  assert.equal(row.geometry.coordinates.length, 2);
  let [lon, lat] = row.geometry.coordinates;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 55.60 && lat < 55.75 && lon > 12.44 && lon < 12.67);
  return { tree: { lat, lon, name }, fallback: !p.traeart?.trim() };
}

async function main() {
  let endpoint = 'https://wfs-kbhkort.kk.dk/k101/ows';
  let params = { service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'k101:trae_basis' };
  async function getCount(): Promise<number> {
    let response = await CityUtil.getWithRetry(endpoint, {
      params: { ...params, resultType: 'hits' }, responseType: 'text', timeout: 120000
    });
    let text: string = response.data;
    let match = text.match(/\bnumberMatched="(\d+)"/);
    assert(match, 'WFS did not return a total');
    let count = Number(match[1]);
    assert(Number.isSafeInteger(count) && count > 0);
    return count;
  }
  let before = await getCount();
  let response = await CityUtil.getWithRetry(endpoint, {
    params: {
      ...params, outputFormat: 'application/json',
      srsName: 'urn:ogc:def:crs:OGC::CRS84', count: before
    },
    timeout: 240000
  });
  let data: { type: string; numberMatched: number; features: Feature[] } = response.data;
  assert.equal(data.type, 'FeatureCollection');
  assert(Array.isArray(data.features));
  assert.equal(data.numberMatched, before, 'Copenhagen inventory changed; retry');
  assert.equal(data.features.length, before, 'Incomplete Copenhagen WFS export');
  let after = await getCount();
  assert.equal(after, before, 'Copenhagen inventory changed during download; retry');
  let ids = new Set<string>();
  let trees: Tree[] = [];
  let exclusions: Record<string, number> = {};
  let genusFallback = 0;
  for (let row of data.features) {
    assert(typeof row.id === 'string' && /^trae_basis\.\d+$/.test(row.id) && !ids.has(row.id),
      'Invalid/repeated Copenhagen feature ID');
    ids.add(row.id);
    let result = treeFromFeature(row);
    if (result.tree) {
      trees.push(result.tree);
      if (result.fallback) ++genusFallback;
    }
    else {
      assert(result.exclusion);
      exclusions[result.exclusion] = (exclusions[result.exclusion] ?? 0) + 1;
    }
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(exclusions).reduce((a, b) => a + b, 0), before);
  fs.writeFileSync(path.join(__dirname, 'copenhagen_dk.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({
    city: 'copenhagen_dk', before, after, unique_ids: ids.size,
    final_count: trees.length, genus_fallback: genusFallback, exclusions
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
