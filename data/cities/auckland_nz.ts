#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

const endpoint = 'https://mapspublic.aucklandcouncil.govt.nz/arcgis/rest/services/LiveMaps/ParkAssetPublic/MapServer/143';
const prefix = 'GEOSTORE.MASTER.TreeRegister.';

interface Tree {
  attributes: {
    'GEOSTORE.MASTER.TreeRegister.SpeciesLatin': string | null;
    'GEOSTORE.MASTER.TreeRegister.TreeStatus': string | null;
    'GEOSTORE.MASTER.TreeRegister.TreeOwner': string | null;
    'GEOSTORE.MASTER.TreeRegister.VALIDATIONSTATE': number | null;
  };
  geometry: { x: number; y: number } | null;
}

interface Layer {
  error?: unknown;
  fields: {
    name: string;
    domain: { type: string; codedValues?: { code: string; name: string }[] } | null;
  }[];
}

// Project owner confirms written bulk-republication permission. GeoMaps otherwise requires consent.
// The council's SpeciesLatin domain supplies botanical names, not the separate common-name codes.
// Preserve co-located observations for process.ts to reconcile after canonicalization.
export function treeSite(row: Tree, species: ReadonlyMap<string, string>) {
  let p = row.attributes;
  if (p['GEOSTORE.MASTER.TreeRegister.TreeStatus'] !== 'Live' ||
      p['GEOSTORE.MASTER.TreeRegister.VALIDATIONSTATE'] !== 3 ||
      p['GEOSTORE.MASTER.TreeRegister.TreeOwner'] === 'PFTL') return;
  let code = p['GEOSTORE.MASTER.TreeRegister.SpeciesLatin']?.trim();
  if (!code || code === 'TBC') return;
  let name = species.get(code);
  assert(name !== undefined, `Unknown Auckland botanical code: ${code}`);
  name = name.replace(/\s+/g, ' ').trim().replace(/\s+spp?\.?$/i, '');
  if (!name || /^(?:unknown|mixed)\b/i.test(name) ||
      /^(?:BRANCH|Cogus palm|Conifer ground cover|DEAD TREE|DELETE|FALLEN BRANCH|FALLEN TREE|GRAPEFRUIT|GROUP|HEDGE|INSPECTION|NOT A TREE|ORANGE|PALM|PRIVATE|SHRUB|VINE|WEED|rubbish)$/i.test(name)) return;
  if (/^(?:Abelia|Agave|Bambusa|Bougainvillea|Cortaderia|Dendrocalamus|Musa|Nerium|Phormium|Ravenala|Strelitzia)\b/i.test(name) ||
      /^Hibiscus rosa-sinensis\b/i.test(name)) return;
  // The regional register contains gross projection/coordinate outliers and missing geometry.
  if (!row.geometry) return;
  let { x: lon, y: lat } = row.geometry;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -37.5 || lat > -35.7 || lon < 174 || lon > 175.7) return;
  return { lat, lon, name };
}

async function main() {
  let layer: Layer = (await CityUtil.getWithRetry(endpoint, { params: { f: 'json' }, timeout: 120000 })).data;
  if (layer.error) throw new Error(`Auckland metadata request failed: ${JSON.stringify(layer.error)}`);
  let domain = layer.fields.find(field => field.name === `${prefix}SpeciesLatin`)?.domain;
  assert(domain?.type === 'codedValue' && domain.codedValues?.length, 'Missing Auckland botanical domain');
  let species = new Map(domain.codedValues.map(value => {
    assert(typeof value.code === 'string' && typeof value.name === 'string' && value.name.trim());
    return [value.code, value.name] as const;
  }));
  assert.equal(species.size, domain.codedValues.length, 'Duplicate Auckland botanical codes');
  // Exclude insertions made during the paged download of this actively maintained register.
  let latest = (await CityUtil.getWithRetry(`${endpoint}/query`, {
    params: {
      f: 'json', where: '1=1', outFields: `${prefix}OBJECTID`, returnGeometry: false,
      orderByFields: `${prefix}OBJECTID DESC`, resultRecordCount: 1
    }, timeout: 120000
  })).data;
  if (latest.error) throw new Error(`Auckland latest-ID request failed: ${JSON.stringify(latest.error)}`);
  let lastId: number = latest.features?.[0]?.attributes?.[`${prefix}OBJECTID`];
  assert(Number.isSafeInteger(lastId) && lastId > 0, 'Missing Auckland upper tree ID');
  let rows: Tree[] = await CityUtil.fetchArcGis(endpoint, {
    fields: ['OBJECTID', 'SpeciesLatin', 'TreeStatus', 'TreeOwner', 'VALIDATIONSTATE']
      .map(field => `${prefix}${field}`).join(','),
    where: `${prefix}TreeStatus = 'Live' AND ${prefix}VALIDATIONSTATE = 3 AND ${prefix}OBJECTID <= ${lastId}`,
    returnGeometry: true, verifyComplete: true
  });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row, species);
    return tree ? [tree] : [];
  });
  assert(trees.length > 100000, 'Unexpectedly few Auckland trees');
  fs.writeFileSync(path.join(__dirname, 'auckland_nz.json'), JSON.stringify(trees));
  console.log(`auckland_nz: ${trees.length} trees; ${rows.length - trees.length} live candidate records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
