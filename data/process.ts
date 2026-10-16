#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';

let cities = [
  'losangeles',
  'seattle',
  'santamonica',
  'westhollywood',
  'beverlyhills',
];

async function main() {
  // read all data
  let data = [];
  console.log('loading...');
  for (let city of cities) {
    let cityData = JSON.parse(fs.readFileSync(`${city}.json`, 'utf8'));
    console.log(`  ${city}: ${cityData.length} sites`);
    for (let d of cityData) {
      assert(d.name && d.lat && d.lon);
      data.push(d);
    }
  }
  console.log(`  TOTAL: ${data.length} sites`);


  // preprocess
  console.log();
  console.log('preprocessing botanical names...');
  let strippedMap = {}
  let unstrippedMap = {}
  for (let d of data) {
    let oldName = d.name;
    let newName = stripCultivar(oldName.trim());
    if (newName != oldName) {
      strippedMap[oldName] = newName;
    }
    else {
      unstrippedMap[oldName] = newName;
    }
    d.name = newName;
  }
  fs.writeFileSync('debug_preprocess_stripped.json', JSON.stringify(strippedMap, null, 2));
  fs.writeFileSync('debug_preprocess_unstripped.json', JSON.stringify(unstrippedMap, null, 2));


  // canonicalize
  console.log();
  console.log('canonicalizing botanical names...');
  let inputNames = [...new Set(data.map(o => o.name))];
  let canonicalizedMap = {}
  let failedMap = {}
  let acceptedRanks = new Set([
    'GENUS',
    'SUBGENUS',
    'SECTION',
    'SUBSECTION',
    'SERIES',
    'SUBSERIES',
    'SPECIES',
    'SPECIES_AGGREGATE',
    'SUBSPECIES',
    'SUBVARIETY',
    'VARIETY',
    'SUBFORM',
    'FORM',
    'CULTIVAR'
  ]);

  for (let start = 0; start < inputNames.length; start += 1000) {
    let batch = inputNames.slice(start, start + 1000);
    let payload = batch.map(name => ({
      scientificName: name,
      kingdom: 'Plantae',
      strict: false
    }));
    let response = await axios.post(
      'https://api.gbif.org/v2/species/match',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    let matches = response.data;
    assert(matches.length == batch.length);
    console.log(`  ... ${start+batch.length}/${inputNames.length}`);

    for (let i = 0; i < batch.length; i++) {
      let name = batch[i];
      let match = matches[i];
      let canonicalName = match?.usage?.canonicalName ?? null;
      let rank = match?.usage?.rank ?? null;
      let confidence = match?.diagnostics?.confidence ?? null;

      if (canonicalName && acceptedRanks.has(rank) && confidence >= 85) {
        canonicalizedMap[name] = canonicalName;
      } else {
        let reason = !canonicalName
          ? 'No canonical name matched'
          : !acceptedRanks.has(rank)
            ? `Rank ${rank ?? 'unknown'} is less specific than genus`
            : `Confidence ${confidence ?? 'unknown'} is below 85`;
        failedMap[name] = { canonicalName, rank, confidence, reason };
      }
    }
  }
  let failedCount = Object.keys(failedMap).length;
  let successCount = Object.keys(canonicalizedMap).length;
  console.log(`  ${successCount} names canonicalized`);
  console.log(`  ${failedCount} names could not be canonicalized (${(failedCount/(failedCount+successCount)*100).toFixed(0)}%)`);

  // discard sites whose names could not be canonicalized
  let discarded = 0;
  data = data.filter(d => {
    let canonicalName = canonicalizedMap[d.name];
    if (!canonicalName) {
      ++discarded
      return false;
    }
    d.name = canonicalName;
    return true;
  });

  fs.writeFileSync('debug_canonicalize.json', JSON.stringify(canonicalizedMap, null, 2));
  fs.writeFileSync('debug_canonicalize_fail.json', JSON.stringify(failedMap, null, 2));

  let names = [...new Set(data.map(o => o.name))];

  let sites = data.map(o => ({
    lat: o.lat,
    lon: o.lon,
    type: names.indexOf(o.name)
  }));

  let types = names.map(o => ({
    canonical_name: o
  }));

  console.log();
  console.log('writing binary files...');
  console.log(`  ${sites.length} sites`);
  console.log(`  ${discarded} sites discarded (${(discarded/(discarded+sites.length)*100).toFixed(0)}%)`);
  console.log(`  ${types.length} unique types`);
  fs.writeFileSync('types.json', JSON.stringify(types, null, 2));
  fs.writeFileSync('sites.json', JSON.stringify(sites, null, 2));
  writeTypesBinary(types);
  writeSitesBinary(sites, types.length);
}

function writeTypesBinary(types: { canonical_name: string }[]): void {
  const headerSize = 4;
  const encodedNames = types.map(type => Buffer.from(type.canonical_name, 'utf8'));
  const totalSize = headerSize + encodedNames.reduce((size, name) => {
    assert(name.length <= 0xffff, 'Type name is too long to encode');
    return size + 2 + name.length;
  }, 0);
  const output = Buffer.alloc(totalSize);

  // Little-endian type count, followed by length-prefixed UTF-8 names.
  output.writeUInt32LE(types.length, 0);

  let offset = headerSize;
  for (const name of encodedNames) {
    output.writeUInt16LE(name.length, offset);
    offset += 2;
    name.copy(output, offset);
    offset += name.length;
  }

  fs.writeFileSync(path.join(__dirname, '../ios/trees/types.bin'), output);
}

function writeSitesBinary(
  sites: { lat: number; lon: number; type: number }[],
  typeCount: number
): void {
  assert(sites.length > 0, 'Cannot write a bounding box for an empty site list');

  let minLat = sites[0].lat;
  let minLon = sites[0].lon;
  let maxLat = sites[0].lat;
  let maxLon = sites[0].lon;
  for (const site of sites) {
    assert(Number.isFinite(site.lat) && Number.isFinite(site.lon), 'Invalid site coordinates');
    minLat = Math.min(minLat, site.lat);
    minLon = Math.min(minLon, site.lon);
    maxLat = Math.max(maxLat, site.lat);
    maxLon = Math.max(maxLon, site.lon);
  }

  const headerSize = 4 + 4 * 8;
  const recordSize = 18;
  const output = Buffer.alloc(headerSize + sites.length * recordSize);

  // Little-endian site count and northwest/southeast bounds, followed by site records.
  output.writeUInt32LE(sites.length, 0);
  output.writeDoubleLE(maxLat, 4);  // north
  output.writeDoubleLE(minLon, 12); // west
  output.writeDoubleLE(minLat, 20); // south
  output.writeDoubleLE(maxLon, 28); // east

  let offset = headerSize;
  for (const site of sites) {
    assert(Number.isInteger(site.type) && site.type >= 0 && site.type < typeCount, 'Invalid site type index');
    assert(site.type <= 0xffff, 'Site type index exceeds 16-bit encoding');
    output.writeDoubleLE(site.lat, offset);
    output.writeDoubleLE(site.lon, offset + 8);
    output.writeUInt16LE(site.type, offset + 16);
    offset += recordSize;
  }

  fs.writeFileSync(path.join(__dirname, '../ios/trees/sites.bin'), output);
}

////////////////////////////////////////

function stripCultivar(name: string): string {
  // normalize quotes
  name = name.replace(/["`‘’]/g, "'"); 

  // handle possessives
  //  Cornus kousa 'Champion's Gold' -> Cornus kousa 'Champion’s Gold'
  name = name.replace(/(\S)'(s )/g, '$1’$2');

  // handle quotes
  let match = name.match(/'/g);
  if (match) {
    let quoteCount = match.length
    if (quoteCount == 1) {
      // one quote; assume cultivar was cut off at the end
      name = name.replace(/\s+'.*/, '');
    }
    else if (quoteCount == 2) {
      name = name.replace(/\s+'[^']+'$/, '');
    }
    else {
      fail();
    }
  }

  return name;
}

////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();
