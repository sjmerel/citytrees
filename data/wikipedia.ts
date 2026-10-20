// Looks up the English Wikipedia article for canonical botanical names. Names are first matched
// exactly against the taxon name on Wikidata, in batches; the rest fall back to fetching the
// Wikipedia page of that title.
// Results are cached in wikipedia_cache.json ({ "<canonical name>": url | null }, where null means
// no suitable article exists), so only names not seen before are queried. The cache can be deleted
// and recreated.

import axios from 'axios';
import fs from 'node:fs';

const API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const CACHE_FILE = 'wikipedia_cache.json';
const SPARQL = 'https://query.wikidata.org/sparql';
const BATCH_SIZE = 150;
const CONCURRENCY = 1;
const DELAY_MS = 250;

// Wikipedia redirects scientific names to the common-name article (e.g. Ulmus -> Elm), so a
// result is only accepted if it looks like an article about plants.
const PLANT_WORDS = /\b(species|genus|trees?|shrubs?|plants?|palms?|conifers?|cultivar|hybrid|family|plum|cherry|apple|pear|oak|maple|elm|pine|fir|spruce|cypress|willow|poplar)\b/i;

async function lookupOne(name: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      let title = encodeURIComponent(name.replace(/ /g, '_'));
      let response = await axios.get(`${API}/${title}`, {
        headers: { 'User-Agent': 'trees-data-pipeline/1.0 (tree identification app)' },
        timeout: 30000,
        validateStatus: status => status === 200 || status === 404 || status === 429,
      });
      if (response.status === 429) {
        // wait as long as the server asks, then try again
        let wait = Number(response.headers['retry-after']) || 5 * 2 ** attempt;
        console.log(`  ${name}: rate limited, waiting ${Math.min(wait, 60)}s`);
        await new Promise(resolve => setTimeout(resolve, Math.min(wait, 60) * 1000));
        continue;
      }
      if (response.status === 404) return null;
      let page = response.data;
      if (page.type !== 'standard') return null;
      let text = `${page.description ?? ''} ${page.extract ?? ''}`;
      if (!PLANT_WORDS.test(text)) return null;
      return page.content_urls?.desktop?.page ?? null;
    }
    catch (error) {
      if (attempt >= 8) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
}

// Wikidata spells hybrids both "Genus × epithet" and "Genus ×epithet".
function wikidataSpellings(name: string): string[] {
  return name.includes(' × ') ? [name, name.replace(' × ', ' ×')] : [name];
}

async function lookupWikidata(names: string[]): Promise<Map<string, string>> {
  let found = new Map<string, string>();
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    let batch = names.slice(i, i + BATCH_SIZE);
    let spellings = new Map<string, string>();
    for (let name of batch) {
      for (let spelling of wikidataSpellings(name)) spellings.set(spelling, name);
    }
    let values = [...spellings.keys()].map(n => JSON.stringify(n)).join(' ');
    let query = `SELECT ?name ?article WHERE {
      VALUES ?name { ${values} }
      ?item wdt:P225 ?name .
      ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
    }`;
    for (let attempt = 0; ; attempt++) {
      try {
        let response = await axios.post(SPARQL, new URLSearchParams({ query }).toString(), {
          headers: {
            'User-Agent': 'trees-data-pipeline/1.0 (tree identification app)',
            'Accept': 'application/sparql-results+json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 60000,
        });
        for (let b of response.data.results.bindings) {
          let name = spellings.get(b.name.value);
          // an exact spelling wins over the hybrid variant
          if (name && (!found.has(name) || b.name.value === name)) found.set(name, b.article.value);
        }
        break;
      }
      catch (error) {
        if (attempt >= 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
      }
    }
    console.log(`  wikidata: ${Math.min(i + BATCH_SIZE, names.length)}/${names.length}`);
  }
  return found;
}

// Returns the Wikipedia URL of each canonical name (null if there is none), in the same order.
export async function lookupWikipediaUrls(canonicalNames: string[]): Promise<(string | null)[]> {
  let cache: Record<string, string | null> =
    fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

  let todo = canonicalNames.filter(name => !(name in cache));
  console.log(`  ${canonicalNames.length - todo.length} names cached, ${todo.length} to look up`);

  let wikidata = todo.length > 0 ? await lookupWikidata(todo) : new Map<string, string>();
  for (let [name, url] of wikidata) cache[name] = url;
  if (todo.length > 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  todo = todo.filter(name => !wikidata.has(name));
  console.log(`  ${wikidata.size} found on wikidata, ${todo.length} to look up directly`);

  let done = 0;
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      let name = todo[next++];
      try {
        cache[name] = await lookupOne(name);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
      catch (error) {
        // not cached, so it is retried on the next run
        console.log(`  ${name}: lookup failed (${(error as Error).message})`);
      }
      if (++done % 25 == 0) {
        console.log(`  ${done}/${todo.length}`);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (todo.length > 0) fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

  return canonicalNames.map(name => cache[name] ?? null);
}
