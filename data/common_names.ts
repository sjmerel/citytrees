// Looks up English common names for canonical botanical names (currently using the ITIS web
// service).
// Results are cached in common_names_cache.json ({ "<canonical name>": { tsn, names } | null, where
// null means ITIS has no such name), so only names not seen before are queried.

import axios from 'axios';
import fs from 'node:fs';

const ITIS = 'https://www.itis.gov/ITISWebService/jsonservice';
const CACHE_FILE = 'common_names_cache.json';
const CONCURRENCY = 4;

async function itis(endpoint: string, params: Record<string, string>): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      // some responses are Latin-1 rather than UTF-8
      let response = await axios.get(`${ITIS}/${endpoint}`, { params, responseType: 'arraybuffer', timeout: 30000 });
      let buffer = Buffer.from(response.data);
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      }
      catch {
        text = new TextDecoder('latin1').decode(buffer);
      }
      return JSON.parse(text);
    }
    catch (error) {
      if (attempt >= 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

// ITIS writes hybrids as "Acer X freemanii".
function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function lookupOne(name: string): Promise<{ tsn: string, names: string[] } | null> {
  let search = await itis('searchByScientificName', { srchKey: name });
  let match = (search.scientificNames ?? []).find(
    (n: any) => n && n.kingdom === 'Plantae' && normalize(n.combinedName) === normalize(name));
  if (!match) return null;

  let result = await itis('getCommonNamesFromTSN', { tsn: match.tsn });
  let names: string[] = [];
  for (let c of result.commonNames ?? []) {
    if (!c || c.language !== 'English' || !c.commonName) continue;
    let commonName = c.commonName.trim();
    if (!names.includes(commonName)) {
      names.push(commonName);
    }
  }
  return { tsn: match.tsn, names };
}

// Only the first letter is changed, so proper nouns in the source ("Callery pear") are kept.
function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// "honey-locust" and "honey locust" are the same name; the first spelling wins.
function dedupe(names: string[]): string[] {
  const key = (n: string) => n.toLowerCase().replace(/[\s-]+/g, '');
  let seen = new Set<string>();
  return names.filter(n => !seen.has(key(n)) && seen.add(key(n)));
}

// Returns the common names of each canonical name (empty if there are none), in the same order.
export async function lookupCommonNames(canonicalNames: string[]): Promise<string[][]> {
  let cache: Record<string, { tsn: string, names: string[] } | null> =
    fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

  let todo = canonicalNames.filter(name => !(name in cache));
  console.log(`  ${canonicalNames.length - todo.length} names cached, ${todo.length} to look up`);

  let done = 0;
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      let name = todo[next++];
      try {
        cache[name] = await lookupOne(name);
      }
      catch (error) {
        // not cached, so it is retried on the next run
        console.log(`  ${name}: lookup failed (${(error as Error).message})`);
      }
      if (++done % 100 == 0) {
        console.log(`  ${done}/${todo.length}`);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (todo.length > 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

  return canonicalNames.map(name => dedupe(cache[name]?.names ?? []).map(sentenceCase));
}
