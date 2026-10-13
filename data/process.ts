#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import assert from 'node:assert';

let cities = [
  'losangeles',
  'seattle',
  'santamonica'
];

async function main() {
  // read all data
  let data = [];
  console.log('loading...');
  for (let city of cities) {
    let cityData = JSON.parse(fs.readFileSync(`${city}.json`, 'utf8'));
    console.log(`  ${city}: ${cityData.length} trees`);
    for (let d of cityData) {
      assert(d.name && d.lat && d.lon);
      data.push(d);
    }
  }
  console.log(`  TOTAL: ${data.length} trees`);


  // preprocess
  console.log('preprocessing...');
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
  console.log('canonicalizing...');
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
    console.log(`  ${start+batch.length}/${inputNames.length}`);

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
  console.log(`  ${Object.keys(failedMap).length} could not be canonicalized`);
  console.log(`  ${Object.keys(canonicalizedMap).length} canonicalized`);

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

  console.log(`discarded ${discarded} trees`);
  fs.writeFileSync('debug_canonicalize.json', JSON.stringify(canonicalizedMap, null, 2));
  fs.writeFileSync('debug_canonicalize_fail.json', JSON.stringify(failedMap, null, 2));

  let names = [...new Set(data.map(o => o.name))];

  let trees = data.map(o => ({
    lat: o.lat,
    lon: o.lon,
    type: names.indexOf(o.name)
  }));
  console.log(`${trees.length} trees`);

  let types = names.map(o => ({
    canonical_name: o
  }));
  console.log(`${types.length} types`);

  // fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  fs.writeFileSync('types.json', JSON.stringify(types, null, 2));
  fs.writeFileSync('trees.json', JSON.stringify(trees, null, 2));
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


