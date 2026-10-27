#!/usr/bin/env NODE_OPTIONS="--max-old-space-size=8192" npx tsx

import fs from 'node:fs';
import assert, { fail } from 'node:assert';
import { lookupWikipediaUrls } from './wikipedia';
import { Normalize } from './normalize';
import { Canonicalize } from './canonicalize';
import { CommonNames } from './common_names';



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

  let types = names.map(o => ({ 
    canonical_name: o,
  }));


  ////////////////////////////////////////
  // get common names

  console.log();
  console.log('looking up common names...');
  types = await getCommonNames(types);

  /*

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


  console.log();
  console.log('writing json files...');
  console.log(`  ${sites.length} sites`);
  writeArray(types, 'types.json');
  console.log(`  ${types.length} unique types`);
  writeArray(sites, 'sites.json');
}




////////////////////////////////////////

function loadCityData(): any[] {
  let cities = loadObject('cities.json');
  let data = [];
  for (let cityObj of cities) {
    let cityData = loadObject(`cities/${cityObj.code}.json`);
    let prevLength = cityData.length;

    cityData = cityData.filter(o => o.name && o.lat && o.lon && Number.isFinite(o.lat) && Number.isFinite(o.lon));
    let droppedEmpty = cityData.length - prevLength;

    // drop suspicious points far from the city center
    let medLat = median(cityData.map(o => o.lat));
    let medLon = median(cityData.map(o => o.lon));
    let maxRadius = cityObj.maxRadiusDegrees ?? 2;
    let latThresh = maxRadius;
    let lonThresh = maxRadius * Math.cos(medLat * Math.PI / 180);

    prevLength = cityData.length;
    cityData = cityData.filter(o => Math.abs(o.lat - medLat) <= latThresh &&
                                    Math.abs(o.lon - medLon) <= lonThresh);
    let droppedOutliers = prevLength - cityData.length;

    console.log(`  ${cityObj.code}: ${cityData.length} sites`);
    if (droppedEmpty) {
      console.log(`   - dropped ${droppedEmpty} invalid sites`);
    }
    if (droppedOutliers) {
      console.log(`   - dropped ${droppedOutliers} outliers`);
    }

    // add to full array, normalizing text
    for (let d of cityData) {
      d.name = Normalize.normalizeText(d.name);
      data.push(d);
    }
  }

  return data;
}

////////////////////////////////////////

function discardNonBotanicalNames(data: any[]): any[] {
  let discardNames = new Set<string>(loadObject('discard_manual.json').map(o => Normalize.normalizeText(o)));
  let prevLength = data.length;
  data = data.filter(o => !discardNames.has(o.name));
  console.log(`  ${prevLength - data.length} sites discarded`);
  return data;
}

////////////////////////////////////////

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

      // save for debugging
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

  // save for debugging
  saveObject('normalize_debug_stripped.json', strippedMap);
  saveObject('normalize_debug_unstripped.json', unstrippedMap);

  return data;
}

////////////////////////////////////////

async function canonicalizeNames(data: any[]): Promise<any[]> {
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
      let fetched = false;
      let canonicalObj = canonicalizeCache[name];
      if (!canonicalObj) {
        console.log(`  canonicalize: ${name} (${index+1}/${names.length})`);
        canonicalObj = await Canonicalize.canonicalizeName(name);
        fetched = true;

        canonicalizeCache[name] = canonicalObj;

        ++n;
        if (n % 100 == 0) { saveObject('canonicalize_cache.json', canonicalizeCache); }
      }

      if (canonicalObj.confidence >= 80) { // 80 is actually the lowest confidence it ever returns...
        assert(canonicalObj.name);
        newName = canonicalObj.name;

        if (fetched && canonicalObj.name != name) {
          console.log(`             -> ${canonicalObj.name} [${canonicalObj.confidence}]`);
        }
        succeededMap[name] = newName;
      }
      else {
        if (fetched) {
          console.log('                * failed');
        }
        failedMap[name] = null;
      }
    }

    // some canonicalizations do not correctly indicate hybrids, so correct that:
    canonicalizeMap[name] = manualHybrids[newName] ?? newName;
  }

  // count # of sites for each failed mapping, so we can triage manually
  let failedSiteCounts = new Map<string, number>();
  for (let d of data) {
    if (Object.hasOwn(failedMap, d.name)) {
      failedSiteCounts.set(d.name, (failedSiteCounts.get(d.name) ?? 0) + 1);
    }
  }
  console.log('  canonicalization failures with the most sites:');
  for (let [name, count] of [...failedSiteCounts].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${count} sites: ${name}`);
  }


  // apply new names, with correct casing
  for (let d of data) {
    if (Object.hasOwn(failedMap, d.name)) {
      failedSiteCounts.set(d.name, (failedSiteCounts.get(d.name) ?? 0) + 1);
    }
    let name = canonicalizeMap[d.name];
    d.name = name ? Canonicalize.canonicalizeCase(name) : undefined;
  }
  data = data.filter(o => o.name);

  // remove unused names from cache to prevent bloat
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
}

////////////////////////////////////////

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

async function getCommonNames(types: any[]): Promise<any[]> {
  // TODO add some manual overrides:  e.g. to remove non-english (nuez encarcelada for carya illinoinensis), or add missing (hong kong orchid for bauhinia)
  // TODO use a curated genus list (since some like Prunus return too-specific (chokecherry))
  let manualNames = loadObject('common_names_manual.json');

  let commonNamesCache = loadCache('common_names_cache.json');
  let succeededMap = {};
  let failedMap = {};
  let n = 0;
  for (let [index, type] of types.entries()) {
    let name = type.canonical_name;
    let result = manualNames[name] ?? commonNamesCache[name];
    if (!result) {
      console.log(`  look up common names: ${name} (${index+1}/${types.length})`);
      result = await CommonNames.lookup(name);
      if (result.commonNames.length) {
        console.log(`     -> ${result.commonNames}`);
      }

      commonNamesCache[name] = result;
      ++n;
      if (n % 100 == 0) { saveObject('common_names_cache.json', commonNamesCache); }
    }

    // if common name search fell back to a more general rank, check if there is a manual entry for that one.
    // e.g. Acer sieboldianum returns no common names, so we check Acer, which returns "Maples"; we override to "Maple".
    result = manualNames[result.matchedName] ?? result;

    type.common_names = result.commonNames;

    if (result.commonNames.length) {
      succeededMap[name] = result.commonNames;
    }
    else {
      failedMap[name] = null;
    }
  }

  saveObject('common_names_cache.json', commonNamesCache);
  saveObject('common_names_debug_failed.json', failedMap);
  saveObject('common_names_debug_succeeded.json', succeededMap);

  return types;
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

function median(values: number[]): number {
  let sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
