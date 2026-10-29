#!/usr/bin/env npx tsx

// Searches the ArcGIS Hub and Socrata catalogs for tree-inventory datasets that have a scientific-name
// field and enough records, skipping sources that cities/*.ts already use.
//
// usage: npx tsx find_tree_datasets.ts [output.json] [--min-records 2000]
//
// The output is a list of candidates to vet by hand: check that the names are botanical (not codes),
// that the data is for the place the owner claims, and that it isn't modeled or crowd-sourced.

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

const QUERIES = [
  'tree inventory', 'street trees', 'urban forest', 'public trees', 'city trees', 'park trees',
  'tree points', 'trees', 'forestry trees', 'tree survey', 'street tree inventory', 'municipal trees',
  'tree census', 'urban tree', 'right of way trees', 'tree assets', 'landscape trees'
];
const HUB_PAGES = 20;       // pages of 100 per query
const SOCRATA_PAGES = 10;   // pages of 100 per query

const SCIENTIFIC_FIELD = /scientific|botanic|latin|sci_?name|genus|species|spp|taxon/i;
const NOT_SCIENTIFIC_FIELD = /^(species_?code|spp_?code|species_?id|speciesid)$/i;
const TREE_NAME = /tree|forest|arbor|canopy|urban/i;

interface Candidate {
  source: 'hub' | 'socrata';
  name: string;
  owner: string;
  url: string;
  records: number | null;
  fields: string[];
  region?: string;
}

function existingSources(): Set<string> {
  let dir = path.join(__dirname, 'cities');
  let used = new Set<string>();
  for (let file of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
    let text = fs.readFileSync(path.join(dir, file), 'utf8');
    for (let m of text.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
      used.add(normalizeUrl(m[0]));
    }
    // Socrata sources built from a domain and dataset id
    let domain = text.match(/['"`]([a-z0-9.-]+\.(?:gov|org|com|us|ca|net))['"`]/i)?.[1];
    let id = text.match(/['"`]([a-z0-9]{4}-[a-z0-9]{4})['"`]/)?.[1];
    if (domain && id) used.add(`${domain.toLowerCase()}/${id}`);
  }
  return used;
}

function normalizeUrl(url: string): string {
  let u = url.toLowerCase().replace(/^https?:\/\//, '').replace(/[?#].*$/, '');
  let m = u.match(/^(.*?\/(?:featureserver|mapserver))/);
  if (m) return m[1];
  return u.replace(/\/(\d+)?\/?$/, '').replace(/\/query$/, '');
}

async function get(url: string, params: object, attempts = 3): Promise<any> {
  for (let i = 1; ; ++i) {
    try {
      return (await axios.get(url, { params, timeout: 60000 })).data;
    }
    catch (error: any) {
      if (i >= attempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * i));
    }
  }
}

async function scanHub(minRecords: number): Promise<Candidate[]> {
  let found = new Map<string, Candidate>();
  for (let q of QUERIES) {
    for (let page = 1; page <= HUB_PAGES; ++page) {
      let data;
      try {
        data = await get('https://opendata.arcgis.com/api/v3/datasets', { q, 'page[size]': 100, 'page[number]': page });
      }
      catch (error: any) {
        console.error(`hub "${q}" page ${page}: ${error.message}`);
        break;
      }
      if (!data.data?.length) break;
      for (let d of data.data) {
        let a = d.attributes;
        let fields: string[] = (a.fields ?? []).map((f: any) => f.name);
        let isTree = TREE_NAME.test(`${a.name} ${a.searchDescription ?? ''} ${(a.tags ?? []).join(' ')}`);
        if (!isTree || a.type !== 'Feature Layer' || a.geometryType !== 'esriGeometryPoint') continue;
        if (!fields.some(f => SCIENTIFIC_FIELD.test(f) && !NOT_SCIENTIFIC_FIELD.test(f))) continue;
        if ((a.recordCount ?? 0) < minRecords || !a.url) continue;
        let key = normalizeUrl(a.url);
        if (!found.has(key)) {
          found.set(key, {
            source: 'hub', name: a.name, owner: a.orgName ?? a.source ?? a.owner, url: a.url,
            records: a.recordCount, fields, region: a.region
          });
        }
      }
      if (data.data.length < 100) break;
    }
    console.log(`hub: "${q}" done, ${found.size} candidates`);
  }
  return [...found.values()];
}

async function scanSocrata(minRecords: number): Promise<Candidate[]> {
  let found = new Map<string, Candidate>();
  for (let q of QUERIES) {
    for (let page = 0; page < SOCRATA_PAGES; ++page) {
      let data;
      try {
        data = await get('https://api.us.socrata.com/api/catalog/v1', { q, only: 'dataset', limit: 100, offset: page * 100 });
      }
      catch (error: any) {
        console.error(`socrata "${q}" page ${page}: ${error.message}`);
        break;
      }
      if (!data.results?.length) break;
      for (let r of data.results) {
        let columns: string[] = r.resource.columns_field_name ?? [];
        let domain: string = r.metadata.domain;
        let id: string = r.resource.id;
        if (!TREE_NAME.test(`${r.resource.name} ${r.resource.description ?? ''}`)) continue;
        if (!columns.some(c => SCIENTIFIC_FIELD.test(c) && !NOT_SCIENTIFIC_FIELD.test(c))) continue;
        let located = columns.some(c => /^(lat|latitude|y|geom|geometry|the_geom|location|point|x|lon|long|longitude)$/i.test(c) || /geocoded|location/i.test(c));
        if (!located) continue;
        let key = `${domain.toLowerCase()}/${id}`;
        if (!found.has(key)) {
          found.set(key, {
            source: 'socrata', name: r.resource.name, owner: domain,
            url: `https://${domain}/resource/${id}.json`, records: null, fields: columns
          });
        }
      }
      if (data.results.length < 100) break;
    }
    console.log(`socrata: "${q}" done, ${found.size} candidates`);
  }

  // the catalog doesn't include row counts
  let kept: Candidate[] = [];
  for (let c of found.values()) {
    try {
      let rows = await get(c.url, { $select: 'count(*)' });
      c.records = Number(Object.values(rows[0] ?? {})[0]);
    }
    catch {
      continue;
    }
    if (c.records >= minRecords) kept.push(c);
  }
  return kept;
}

async function main() {
  let args = process.argv.slice(2);
  let minRecords = 2000;
  let output = '/tmp/tree_dataset_candidates.json';
  for (let i = 0; i < args.length; ++i) {
    if (args[i] === '--min-records') minRecords = Number(args[++i]);
    else output = args[i];
  }

  let used = existingSources();
  let all = [...await scanHub(minRecords), ...await scanSocrata(minRecords)];
  let candidates = all.filter(c => {
    let key = c.source === 'socrata' ? new URL(c.url).hostname.toLowerCase() + '/' + path.basename(c.url, '.json') : normalizeUrl(c.url);
    return !used.has(key);
  });
  candidates.sort((a, b) => (b.records ?? 0) - (a.records ?? 0));

  fs.writeFileSync(output, JSON.stringify(candidates, null, 2));
  console.log(`${all.length} matching datasets, ${all.length - candidates.length} already used, ${candidates.length} new`);
  console.log(`wrote ${output}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
