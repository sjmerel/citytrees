#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import process from 'node:process';
import axios from 'axios';
import { Normalize } from './normalize';

let userAgent = 'CityTrees/2.0 (https://github.com/sjmerel/trees; sjmerel@fastmail.net)';


export namespace Wikipedia {

  export async function lookupUrl(name: string, debug: boolean = false): Promise<string | null> {
    let url = await lookup(name, debug);
    if (url) {
      return url;
    }

    if (!name.includes(Normalize.hybridMarker)) {
      // try less specific names
      let speciesName = name.replace(/\s+(?:subsp|ssp|subvar|var|subf|f)\.?\s+.*$/i, '');
      if (speciesName !== name) {
        console.log(`    retrying as: ${speciesName}`);
        let url = await lookup(speciesName, debug);
        if (url) {
          return url;
        }
      }

      let genus = speciesName.split(/\s+/)[0];
      if (genus === speciesName) {
        return null;
      }
      else {
        console.log(`    retrying as: ${genus}`);
        let url = await lookup(genus, debug);
        return url;
      }
    }

    return null;
  }
}


////////////////////////////////////////

async function lookup(name: string, debug: boolean) {
  let url = await lookupWikidata(name, debug);
  if (url) { return url; }
  return await lookupTitle(name, debug);
}


async function lookupTitle(name: string, debug: boolean): Promise<string | null> {
  let params: Record<string, string | number> = {
    action: 'query',
    titles: name,
    redirects: 1,
    prop: 'info|pageprops',
    inprop: 'url',
    ppprop: 'wikibase_item|disambiguation',
    format: 'json',
    formatversion: 2
  };
  let disambiguationId: number | undefined;
  let continuation = {};
  do {
    let response = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: { ...params, ...continuation },
      headers: { 'User-Agent': userAgent },
      timeout: 60000
    });
    let data = response.data;
    if (data.error) throw new Error(`Wikipedia: ${data.error.code}: ${data.error.info}`);
    let pages = data.query?.pages ?? [];
    if (debug) console.log(pages);

    if (disambiguationId === undefined) {
      let page = pages[0];
      if (!page || page.missing) return null;
      if (page.pageprops?.disambiguation !== undefined) {
        disambiguationId = page.pageid;
        assert(disambiguationId !== undefined, 'Missing disambiguation page ID');
        delete params.titles;
        params.pageids = disambiguationId;
        params.generator = 'links';
        params.gplnamespace = 0;
        params.gpllimit = 'max';
        continue;
      }
    }

    let url = await firstPlantPage(pages, debug);
    if (url) return url;
    if (!data.continue) return null;
    continuation = data.continue;
  } while (true);
}

async function firstPlantPage(pages: any[], debug: boolean): Promise<string | null> {
  let candidates = pages.filter(page =>
    !page.missing && page.canonicalurl && page.pageprops?.wikibase_item &&
    page.pageprops.disambiguation === undefined
  );
  if (!candidates.length) return null;
  let ids = [...new Set(candidates.map(page => page.pageprops!.wikibase_item!))];
  let plants = await getPlantIds(ids, debug);
  return candidates.find(page => plants.has(page.pageprops!.wikibase_item!))?.canonicalurl ?? null;
}

async function getPlantIds(ids: string[], debug: boolean): Promise<Set<string>> {
  if (!ids.length) return new Set();
  assert(ids.every(id => /^Q\d+$/.test(id)), 'Invalid Wikidata item');
  // Explicit IDs keep the ancestry traversal bounded to these candidates.
  let matches = await queryWikidata<{ item: { value: string } }>(`
        SELECT DISTINCT ?item WHERE {
          VALUES ?item { ${ids.map(id => `wd:${id}`).join(' ')} }
          ?item wdt:P171* wd:Q756 .
          hint:Prior hint:gearing "forward" .
        }
      `);
  if (debug) console.log(matches);
  return new Set(matches.map(match => match.item.value.split('/').pop()!));
}

async function lookupWikidata(name: string, debug: boolean): Promise<string | null> {
  let query = `
      SELECT DISTINCT ?name ?item ?article WHERE {
        VALUES ?name { ${JSON.stringify(name)} }
        ?item wdt:P225 ?name .
        ?article schema:about ?item ;
                 schema:isPartOf <https://en.wikipedia.org/> .
      }
    `;
  let matches = await queryWikidata<{
    name: { value: string };
    item: { value: string };
    article: { value: string };
  }>(query);
  let ids = [...new Set(matches.map(match => match.item.value.split('/').pop()!))];
  let plants = await getPlantIds(ids, debug);
  matches = matches.filter(match => plants.has(match.item.value.split('/').pop()!));
  if (debug) { console.log(matches); }

  let exact = matches.filter(match => match.name.value === name);
  let best = exact.length ? exact : matches;
  let urls = new Set(best.map(match => match.article.value));
  if (urls.size > 1 && debug) console.log(`Ambiguous Wikipedia match for ${name}`);
  return urls.size === 1 ? [...urls][0] : null;
}

async function queryWikidata<T>(query: string): Promise<T[]> {
  let response = await axios.get<{ results: { bindings: T[] } }>('https://query.wikidata.org/sparql', {
    params: {
      query,
      format: 'json'
    },
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/sparql-results+json'
    },
    timeout: 60000
  });

  let matches = response.data.results?.bindings;
  assert(Array.isArray(matches), 'Invalid Wikidata query response');
  return matches;
}


////////////////////////////////////////

async function main() {
  let arg = process.argv[2];
  let result = await Wikipedia.lookupUrl(arg, true);
  console.log(result);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
