#!/usr/bin/env npx tsx

import fs from 'node:fs';
import assert, { fail } from 'node:assert';
import { lookupCommonNames } from './common_names';
import { lookupWikipediaUrls } from './wikipedia';
import { Normalize } from './normalize';
import { Canonicalize } from './canonicalize';


function median(values: number[]): number {
  let sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {

  ////////////////////////////////////////
  // read all data
  // discard dubious locations
  // normalize raw text

  console.log('loading...');
  let data = loadCityData();
  console.log(`  = TOTAL: ${data.length} sites`);


  ////////////////////////////////////////
  // discard sites with non-botanical names (e.g. "stump", "vacant site")

  console.log();
  console.log('discarding non-botanical names...');
  data = discardNonBotanicalNames(data);
  console.log(`  = TOTAL: ${data.length} sites`);


  ////////////////////////////////////////
  // normalize names: strip cultivars, remove 'spp' at end, etc

  console.log();
  console.log('normalizing botanical names...');
  data = normalizeNames(data);
  console.log(`  = TOTAL: ${data.length} sites`);


  ////////////////////////////////////////
  // canonicalize names

  console.log();
  console.log('canonicalizing botanical names...');
  data = await canonicalizeNames(data);
  console.log(`  = TOTAL: ${data.length} sites`);


  ////////////////////////////////////////
  // handle sites with multiple trees in the same location:
  // keep them only if they are the same species.

  console.log();
  console.log('handling duplicate locations...');
  data = await handleDuplicateLocations(data);
  console.log(`  = TOTAL: ${data.length} sites`);


  ////////////////////////////////////////

  let names = [...new Set(data.map(o => o.name))];

  let typeIndex = new Map<string, number>(names.map((name, i) => [name, i]));

  let sites = data.map(o => ({
    lat: o.lat,
    lon: o.lon,
    type: typeIndex.get(o.name)!
  }));


  /*
  ////////////////////////////////////////
  // common names (looked up for the final, canonicalized names)
  console.log();
  console.log('looking up common names...');
  let commonNames = await lookupCommonNames(names);
  let withCommonNames = commonNames.filter(n => n.length > 0).length;
  console.log(`  ${withCommonNames} of ${names.length} types have common names`);

  // wikipedia articles
  console.log();
  console.log('looking up wikipedia urls...');
  let wikipediaUrls = await lookupWikipediaUrls(names);
  console.log(`  ${wikipediaUrls.filter(u => u).length} of ${names.length} types have wikipedia urls`);

  let types = names.map((o, i) => ({
    canonical_name: o,
    common_names: commonNames[i],
    ...(wikipediaUrls[i] ? { wikipedia_url: wikipediaUrls[i] } : {})
  }));
  */

  let types = names.map(o => ({ 
    canonical_name: o,
  }));

  console.log();
  console.log('writing json files...');
  console.log(`  ${sites.length} sites`);
  writeArray(types, 'types.json');
  console.log(`  ${types.length} unique types`);
  writeArray(sites, 'sites.json');
}




////////////////////////////////////////

// write large array in chunks, if the full string is too long
function writeArray(array: [any], path: string) {
  let fd = fs.openSync(path, 'w');
  fs.writeSync(fd, '[');
  for (let i = 0; i < array.length; i += 50000) {
    let chunk = array.slice(i, i + 50000).map(s => JSON.stringify(s, null, 2).replace(/^/gm, '  ')).join(',\n');
    fs.writeSync(fd, (i > 0 ? ',\n' : '\n') + chunk);
  }
  fs.writeSync(fd, '\n]\n');
  fs.closeSync(fd);
}

////////////////////////////////////////

function loadCityData(): any[] {
  let cities = loadObject('cities.json');
  let data = [];
  for (let cityObj of cities) {
    let cityData = loadObject(`cities/${cityObj.code}.json`);
    for (let d of cityData) {
      assert(d.name && d.lat && d.lon && Number.isFinite(d.lat) && Number.isFinite(d.lon));
    }

    // drop suspicious points far from the city center
    let medLat = median(cityData.map(o => o.lat));
    let medLon = median(cityData.map(o => o.lon));
    let maxRadius = cityObj.maxRadiusDegrees ?? 2;
    let latThresh = maxRadius;
    let lonThresh = maxRadius * Math.cos(medLat * Math.PI / 180);
    let prevCount = cityData.length;
    cityData = cityData.filter(o => Math.abs(o.lat - medLat) <= latThresh &&
                                    Math.abs(o.lon - medLon) <= lonThresh);
    let droppedCount = prevCount - cityData.length;
    console.log(`  ${cityObj.code}: ${cityData.length} sites` + (droppedCount ? `  (dropped ${droppedCount} outliers)` : ''));
   /*
    console.log(`  ${cityObj.code}: ${cityData.length} sites (XXX not checking for outliers)`);
    */

    // add to full array, normalizing text
    for (let d of cityData) {
      d.name = Normalize.normalizeText(d.name);
      data.push(d);
    }
  }

  return data;
}


function discardNonBotanicalNames(data: any[]): any[] {
  let discardNames = new Set<string>(loadObject('discard_manual.json').map(o => Normalize.normalizeText(o)));
  let prevLength = data.length;
  data = data.filter(o => !discardNames.has(o.name));
  console.log(`  ${prevLength - data.length} sites discarded`);
  return data;
}


function normalizeNames(data: any[]): any[] {
  // normalize with a manually maintained list for where the algorithmically stripped name obviously fails 
  //  (e.g. still contains cultivars)
  let manualNames = normalizeMap(loadObject('normalize_manual.json'));

  // some species are labeled only by genus and cultivar (e.g. "ilex 'Wilsonii'" is ilex x altaclarensis);
  // normalize those manually also.
  let manualNamesGc = normalizeMap(loadObject('normalize_genus_cultivar_manual.json'));

  // normalize with the dictionaries read above, or else normalize with a heuristic.
  let names = [...new Set(data.map(o => o.name))];
  let normalizedMap = {}
  let strippedMap = {}
  let unstrippedMap = {}
  for (let name of names) {
    let newName = manualNames[name] ?? manualNamesGc[name];
    if (!newName) {
      newName = Normalize.normalizeName(name);
      if (newName != name) {
        strippedMap[name] = newName;
      }
      else {
        unstrippedMap[name] = newName;
      }
    }
    normalizedMap[name] = newName;
  }

  for (let d of data) {
    d.name = normalizedMap[d.name];
  }
  data = data.filter(o => o.name); // remove any sites with now-empty names

  saveObject('normalize_debug_stripped.json', strippedMap);
  saveObject('normalize_debug_unstripped.json', unstrippedMap);

  return data;
}


async function canonicalizeNames(data: any[]): any[] {
  // manually maintaned canonicalizations
  let manualNames = normalizeMap(loadObject('canonicalize_manual.json'));

  // some canonicalizations do not correctly indicate hybrids, so correct that:
  let manualHybrids = normalizeMap(loadObject('canonicalize_hybrids_manual.json'));

  let names = [...new Set(data.map(o => o.name))];
  let canonicalizeCache = loadCache('canonicalize_cache.json');
  let canonicalizeMap = {};
  let succeededMap = {};
  let failedMap = {};
  let n = 0;
  for (let [index, name] of names.entries()) {
    let newName = manualNames[name];
    if (!newName) {
      let canonicalObj = canonicalizeCache[name];
      if (!canonicalObj) {
        console.log(`  canonicalize: ${name} (${index}/${names.length})`);
        canonicalObj = await Canonicalize.canonicalizeName(name);
        if (n % 100 == 0) {   saveObject('canonicalize_cache.json', canonicalizeCache); }
        canonicalizeCache[name] = canonicalObj;
        ++n;
      }
      if (canonicalObj && canonicalObj.confidence >= 80) { // 80 is actually the lowest confidence it ever returns...
        newName = canonicalObj.name;
        succeededMap[name] = newName;
        assert(canonicalObj.name);
      }
      else {
        failedMap[name] = null;
      }
    }

    // some canonicalizations do not correctly indicate hybrids, so correct that:
    canonicalizeMap[name] = manualHybrids[newName] ?? newName;
  }

  // apply new names
  for (let d of data) {
    d.name = canonicalizeMap[d.name];
  }
  data = data.filter(o => o.name);

  // remove unused names from cache
  let usedNames = new Set(names);
  for (let name of Object.keys(canonicalizeCache)) {
    if (!usedNames.has(name)) {
      delete canonicalizeCache[name];
    }
  }

  saveObject('canonicalize_cache.json', canonicalizeCache);
  saveObject('canonicalize_debug_failed.json', failedMap);
  saveObject('canonicalize_debug_succeeded.json', succeededMap);

  return data;

  // TODO handle hybrids
  // TODO print list of failed names with the most sites

  /*
  let { canonical: canonicalizedMap, failed: failedMap } = await Canonicalize.canonicalizeNames(names);

  let failedCount = Object.keys(failedMap).length;
  let successCount = Object.keys(canonicalizedMap).length;
  console.log(`  ${successCount} names canonicalized`);
  console.log(`  ${failedCount} names could not be canonicalized (${(failedCount/(failedCount+successCount)*100).toFixed(0)}%)`);

  // count the sites affected by each failure, to prioritize fixing them
  let siteCounts = new Map<string, number>();
  for (let d of data) {
    siteCounts.set(d.name, (siteCounts.get(d.name) ?? 0) + 1);
  }

  // discard sites whose names could not be canonicalized
  //let hybrids: Record<string, string> = JSON.parse(fs.readFileSync('known_hybrids.json', 'utf8'));
  let discarded = 0;
  data = data.filter(d => {
    let canonicalName = canonicalizedMap[d.name];
    if (!canonicalName) {
      ++discarded
      return false;
    }
    else {
      //d.name = hybrids[canonicalName] ?? canonicalName;
      d.name = canonicalName;
      return true;
    }
  });
  console.log(`  ${discarded} sites discarded (${(discarded/(discarded+data.length)*100).toFixed(0)}%)`);

  // write debug files
  fs.writeFileSync('canonicalize_debug_succeeded.json', JSON.stringify(canonicalizedMap, null, 2));
  let failedWithSites = Object.entries(failedMap)
    .map(([name, failure]) => [name, { sites: siteCounts.get(name) ?? 0, ...failure }] as const)
    .sort(([, a], [, b]) => b.sites - a.sites);
  fs.writeFileSync('canonicalize_debug_failed.json', JSON.stringify(Object.fromEntries(failedWithSites), null, 2));
  console.log('  most affected failures:');
  for (let [name, failure] of failedWithSites.slice(0, 10)) {
    console.log(`    ${failure.sites} sites: ${name} (${failure.reason})`);
  }
 */

}

function handleDuplicateLocations(data: any[]): any[] {
  // Sorts site indices by location instead of grouping in a Map of arrays, which runs out of memory
  // with millions of sites. Ties are broken by index, so the first site in each group is kept.
  let count = data.length;
  let lats = new Float64Array(count);
  let lons = new Float64Array(count);
  for (let i = 0; i < count; ++i) {
    lats[i] = data[i].lat;
    lons[i] = data[i].lon;
  }
  let order = new Uint32Array(count);
  for (let i = 0; i < count; ++i) { order[i] = i; }
  order.sort((a, b) => (lats[a] - lats[b]) || (lons[a] - lons[b]) || (a - b));

  let keep = new Uint8Array(count);
  let dedupedSame = 0;
  let droppedMixed = 0;
  for (let start = 0; start < count; ) {
    let first = order[start];
    let end = start + 1;
    let allSame = true;
    while (end < count && lats[order[end]] == lats[first] && lons[order[end]] == lons[first]) {
      if (data[order[end]].name != data[first].name) { allSame = false; }
      ++end;
    }
    let size = end - start;
    if (size == 1 || allSame) {
      keep[first] = 1;
      dedupedSame += size - 1;
    } else {
      droppedMixed += size;
    }
    start = end;
  }
  data = data.filter((_, i) => keep[i]);
  console.log(`  ${dedupedSame} duplicate same-species sites merged`);
  console.log(`  ${droppedMixed} mixed-species co-located sites dropped`);
  return data;
}

////////////////////////////////////////

function loadCache(path: string): any {
  if (fs.existsSync(path)) {
    return loadObject(path);
  }
  else {
    return {};
  }
}

function normalizeMap(obj: Record<string, string>): Record<string, string> {
  let normalized = {};
  for (let [key, value] of Object.entries(obj)) {
    let normalizedKey = Normalize.normalizeText(key);
    let normalizedValue = Normalize.normalizeText(value);
    assert(!Object.hasOwn(normalized, normalizedKey) ||
           normalized[normalizedKey] === normalizedValue);
    normalized[normalizedKey] = normalizedValue;
  }
  return normalized;
}

function loadObject(path: string): any {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function saveObject(path: string, cache: any) {
  fs.writeFileSync(path, JSON.stringify(cache, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
