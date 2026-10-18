#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import assert from 'node:assert';

let cities = [
  'beverlyhills',
  'losangeles',
  'newyorkcity',
  'pasadena',
  'sanfrancisco',
  'santamonica',
  'seattle',
  'westhollywood',
  'austin',
  'berkeley',
  'cambridge',
  'denver',
  'london',
  'montreal',
  'oakland',
  'philadelphia',
  'portland',
  'sacramento',
  'sanjose',
  'toronto',
  'vancouver',
  'victoria',
  'washingtondc',
  'waterloo',
  'atlanta',
  'baltimore',
  'boston',
  'neworleans',
  'sandiego',
];


async function main() {

  // read all data
  let data = [];
  console.log('loading...');
  for (let city of cities) {
    let cityData = JSON.parse(fs.readFileSync(`${city}.json`, 'utf8'));
    console.log(`  ${city}: ${cityData.length} sites`);
    for (let d of cityData) {
      if (!(d.name && d.lat && d.lon && Number.isFinite(d.lat) && Number.isFinite(d.lon))) { console.log(d); }
      assert(d.name && d.lat && d.lon && Number.isFinite(d.lat) && Number.isFinite(d.lon));
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

      if (canonicalName && acceptedRanks.has(rank) && confidence >= 80) {
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
  let failedMapSorted = Object.fromEntries(
    Object.entries(failedMap).sort(([, a], [, b]) =>
      (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity)
    )
  );
  fs.writeFileSync('debug_canonicalize_fail.json', JSON.stringify(failedMapSorted, null, 2));

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
  console.log('writing json files...');
  console.log(`  ${sites.length} sites`);
  console.log(`  ${discarded} sites discarded (${(discarded/(discarded+sites.length)*100).toFixed(0)}%)`);
  console.log(`  ${types.length} unique types`);
  fs.writeFileSync('types.json', JSON.stringify(types, null, 2));
  fs.writeFileSync('sites.json', JSON.stringify(sites, null, 2));
}

////////////////////////////////////////

function stripCultivar(name: string): string {
  // normalize quotes
  name = name.replace(/(?:\\"|["`‘’“”])/g, "'");

  // handle possessives
  //  Cornus kousa 'Champion's Gold' -> Cornus kousa 'Champion’s Gold'
  name = name.replace(/(\S)'(s )/g, '$1’$2');

  const cultivarStart = name.search(/\s+'/);
  if (cultivarStart < 0) {
    return name;
  }

  const cultivar = name.slice(cultivarStart + 1);
  const quoteCount = (cultivar.match(/'/g) ?? []).length;
  if (cultivar.endsWith("'") || quoteCount === 1) {
    return name.slice(0, cultivarStart).trimEnd();
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
