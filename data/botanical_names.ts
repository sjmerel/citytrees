// Canonicalizes botanical names (fixing typos, synonyms and so on) using the GBIF species
// match API. Raw match results are cached in botanical_names_cache.json ({ "<input name>":
// { canonicalName, rank, confidence } }, with nulls where GBIF has no match), so only names
// not seen before are queried (except names in manual_botanical_names.json, which win). Acceptance rules are applied to the cached results, so
// changing them doesn't require new queries.

import axios from 'axios';
import fs from 'node:fs';
import assert from 'node:assert';

const CACHE_FILE = 'botanical_names_cache.json';
const MANUAL_FILE = 'manual_botanical_names.json';
const BATCH_SIZE = 1000;

// all-caps names ("PINUS SPP.") get fuzzy-matched to the wrong genus, so lower-case them
function sentenceCase(name: string): string {
  return name === name.toUpperCase() ? name.charAt(0) + name.slice(1).toLowerCase() : name;
}

function normalize(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
const MIN_CONFIDENCE = 80;

const ACCEPTED_RANKS = new Set([
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

interface Match {
  canonicalName: string | null;
  rank: string | null;
  confidence: number | null;
  // true once the v1 fallback has been tried for this name
  v1?: boolean;
}

export interface Failure extends Match {
  reason: string;
}

export interface CanonicalizeResult {
  // input name -> canonical name, for names that were canonicalized
  canonical: Record<string, string>;
  // input name -> what was found, for names that were not
  failed: Record<string, Failure>;
}

export async function canonicalizeNames(inputNames: string[]): Promise<CanonicalizeResult> {
  let cache: Record<string, Match> =
    fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};

  // manual corrections take precedence over GBIF (keys matched case-insensitively)
  let manual = new Map<string, string>();
  for (let [raw, name] of Object.entries(JSON.parse(fs.readFileSync(MANUAL_FILE, 'utf8')) as Record<string, string>)) {
    manual.set(normalize(raw), name);
  }
  let isManual = (name: string) => manual.has(normalize(name));

  let todo = inputNames.filter(name => !isManual(name) && !(name in cache));
  console.log(`  ${inputNames.length - todo.length} names cached, ${todo.length} to look up`);

  for (let start = 0; start < todo.length; start += BATCH_SIZE) {
    let batch = todo.slice(start, start + BATCH_SIZE);
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
    console.log(`  ... ${start + batch.length}/${todo.length}`);

    for (let i = 0; i < batch.length; i++) {
      cache[batch[i]] = {
        canonicalName: matches[i]?.usage?.canonicalName ?? null,
        rank: matches[i]?.usage?.rank ?? null,
        confidence: matches[i]?.diagnostics?.confidence ?? null
      };
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  }

  // The v2 batch API returns no match for ambiguous names such as bare genera ("Ulmus"),
  // so retry unmatched names once with the v1 API, which resolves them.
  let retry = inputNames.filter(name => !isManual(name) && !cache[name].canonicalName && !cache[name].v1);
  if (retry.length) {
    console.log(`  retrying ${retry.length} unmatched names with v1 API`);
    let next = 0;
    let worker = async () => {
      while (next < retry.length) {
        let name = retry[next++];
        let m = (await axios.get('https://api.gbif.org/v1/species/match',
          { params: { name: sentenceCase(name), kingdom: 'Plantae' } })).data;
        cache[name] = {
          canonicalName: m.canonicalName ?? null,
          rank: m.rank ?? null,
          confidence: m.confidence ?? null,
          v1: true
        };
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
  }

  let canonical: Record<string, string> = {};
  let failed: Record<string, Failure> = {};
  for (let name of inputNames) {
    if (isManual(name)) {
      canonical[name] = manual.get(normalize(name))!;
      continue;
    }
    let { canonicalName, rank, confidence } = cache[name];
    if (canonicalName && ACCEPTED_RANKS.has(rank!) && confidence! >= MIN_CONFIDENCE) {
      canonical[name] = canonicalName;
    }
    else {
      let reason = !canonicalName
        ? 'No canonical name matched'
        : !ACCEPTED_RANKS.has(rank!)
          ? `Rank ${rank ?? 'unknown'} is less specific than genus`
          : `Confidence ${confidence ?? 'unknown'} is below ${MIN_CONFIDENCE}`;
      failed[name] = { canonicalName, rank, confidence, reason };
    }
  }
  return { canonical, failed };
}
