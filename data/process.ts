#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { fail } from 'node:assert';
import { canonicalizeNames } from './botanical_names';
import { lookupCommonNames } from './common_names';
import { lookupWikipediaUrls } from './wikipedia';
import { cleanName, normalizeName } from './name_cleanup';


async function main() {

  ////////////////////////////////////////
  // read all data
  let cities: string[] = JSON.parse(fs.readFileSync('cities.json', 'utf8')).map((city: { code: string }) => city.code);
  let data = [];
  console.log('loading...');
  for (let city of cities) {
    let cityData = JSON.parse(fs.readFileSync(`cities/${city}.json`, 'utf8'));
    console.log(`  ${city}: ${cityData.length} sites`);
    for (let d of cityData) {
      if (!(d.name && d.lat && d.lon && Number.isFinite(d.lat) && Number.isFinite(d.lon))) { 
        console.log(d); 
        fail();
      }
      data.push(d);
    }
  }
  console.log(`  TOTAL: ${data.length} sites`);



  ////////////////////////////////////////
  // remove sites with non-botanical names, like "Stump" or "Vacant site"
  console.log();
  console.log('removing non-botanical names...');

  let nonBotanical = new Set<string>(JSON.parse(fs.readFileSync('non_botanical_names.json', 'utf8')).map(normalizeName));
  let removed = 0;
  let removeNonBotanical = () => {
    data = data.filter(d => {
      if (nonBotanical.has(normalizeName(d.name))) {
        ++removed;
        return false;
      }
      return true;
    });
  };
  removeNonBotanical();



  ////////////////////////////////////////
  // normalize names: strip cultivars, trade marks and placeholders
  console.log();
  console.log('normalizing botanical names...');

  // names with a manual entry are matched as written, before any cleanup
  let manualNames = new Set<string>(Object.keys(JSON.parse(fs.readFileSync('manual_botanical_names.json', 'utf8'))).map(normalizeName));
  let strippedMap = {}
  let unstrippedMap = {}
  for (let d of data) {
    let oldName = d.name;
    let newName = manualNames.has(normalizeName(oldName)) ? oldName.trim() : cleanName(oldName);
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

  // normalization can reveal non-botanical names, e.g. "Unknown spp." becomes "Unknown"
  removeNonBotanical();
  console.log(`  ${removed} sites with non-botanical names removed`);



  ////////////////////////////////////////
  // canonicalize names
  console.log();
  console.log('canonicalizing botanical names...');
  let inputNames = [...new Set(data.map(o => o.name))];
  let { canonical: canonicalizedMap, failed: failedMap } = await canonicalizeNames(inputNames);
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
  let hybrids: Record<string, string> = JSON.parse(fs.readFileSync('known_hybrids.json', 'utf8'));
  let discarded = 0;
  data = data.filter(d => {
    let canonicalName = canonicalizedMap[d.name];
    if (!canonicalName) {
      ++discarded
      return false;
    }
    d.name = hybrids[canonicalName] ?? canonicalName;
    return true;
  });
  console.log(`  ${discarded} sites discarded (${(discarded/(discarded+data.length)*100).toFixed(0)}%)`);

  // write debug files
  fs.writeFileSync('debug_canonicalize.json', JSON.stringify(canonicalizedMap, null, 2));
  let failedWithSites = Object.entries(failedMap)
    .map(([name, failure]) => [name, { sites: siteCounts.get(name) ?? 0, ...failure }] as const)
    .sort(([, a], [, b]) => b.sites - a.sites);
  fs.writeFileSync('debug_canonicalize_fail.json', JSON.stringify(Object.fromEntries(failedWithSites), null, 2));
  console.log('  most affected failures:');
  for (let [name, failure] of failedWithSites.slice(0, 10)) {
    console.log(`    ${failure.sites} sites: ${name} (${failure.reason})`);
  }



  ////////////////////////////////////////
  // handle sites with multiple trees in the same location:
  // keep them only if they are the same species.

  console.log();
  console.log('handling duplicate locations...');
  let byLocation = new Map<string, any[]>();
  for (let d of data) {
    let key = `${d.lat},${d.lon}`;
    let group = byLocation.get(key);
    if (group) { group.push(d); } else { byLocation.set(key, [d]); }
  }
  let dedupedSame = 0;
  let droppedMixed = 0;
  data = [];
  for (let group of byLocation.values()) {
    if (group.length == 1) {
      data.push(group[0]);
    } else if (group.every(d => d.name == group[0].name)) {
      data.push(group[0]);
      dedupedSame += group.length - 1;
    } else {
      droppedMixed += group.length;
    }
  }
  console.log(`  ${dedupedSame} duplicate same-species sites merged`);
  console.log(`  ${droppedMixed} mixed-species co-located sites dropped`);


  ////////////////////////////////////////

  let names = [...new Set(data.map(o => o.name))];

  let sites = data.map(o => ({
    lat: o.lat,
    lon: o.lon,
    type: names.indexOf(o.name)
  }));


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

  console.log();
  console.log('writing json files...');
  console.log(`  ${sites.length} sites`);
  console.log(`  ${types.length} unique types`);
  fs.writeFileSync('types.json', JSON.stringify(types, null, 2));
  // the app lists the cities in its about page
  fs.copyFileSync('cities.json', '../ios/trees/cities.json');
  // written in chunks, since the full string can exceed Node's maximum string length
  let fd = fs.openSync('sites.json', 'w');
  fs.writeSync(fd, '[');
  for (let i = 0; i < sites.length; i += 50000) {
    let chunk = sites.slice(i, i + 50000).map(s => JSON.stringify(s, null, 2).replace(/^/gm, '  ')).join(',\n');
    fs.writeSync(fd, (i > 0 ? ',\n' : '\n') + chunk);
  }
  fs.writeSync(fd, '\n]\n');
  fs.closeSync(fd);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
