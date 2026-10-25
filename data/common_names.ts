#!/usr/bin/env npx tsx

import { fileURLToPath } from 'node:url';
import assert, { fail } from 'node:assert';
import process from 'node:process';
import axios from 'axios';
import http from 'http';
import https from 'https';
import { Normalize } from './normalize';

const urlBase = 'https://www.itis.gov/ITISWebService/jsonservice';

const itisClient = axios.create({
  // Disable keep-alive to prevent "socket hang up" from stale server resets
  httpAgent: new http.Agent({ keepAlive: false }),
  httpsAgent: new https.Agent({ keepAlive: false }),
});

export namespace CommonNames {

  export async function lookup(name: string, debug: boolean = false) {
    /*
    if (name.contains(Normalize.hybridMarker)) {
       return doLookup results if not empty.
       otherwise, replace hybridMarker with 'X'; return doLookup results if not empty.
       otherwise, remove hybridMarker; return doLookup results.
    }
    else {
      return doLookup results if not empty.
      otherwise, if contains subsp/var/f etc, remove that (e.g. 'koelreuteria elegans subsp formosana' -> 'koelreuteria elegans'); return doLookup results if not empty.
      otherwise, if contains species, remove that (e.g. 'koelreuteria elegans' -> 'koelreuteria'); retur doLookup results.
    }
    */

    return doLookup(name, debug);
  }

}


////////////////////////////////////////

async function itisQuery(endpoint: string, params: any, debug = false) {
  let response = await itisClient.get(`${urlBase}/${endpoint}`, { params: params });
  let result = response.data;
  if (debug) { console.log(result); }
  return result;
}

async function doLookup(name: string, debug = false) {
  let result = await itisQuery('searchByScientificName', { srchKey: name }, debug);

  let scientificNames = result.scientificNames;
  if (scientificNames) {
    // find an exact match to the name
    let match = scientificNames.find(o => o.kingdom == 'Plantae' && Normalize.normalizeText(o.combinedName) == Normalize.normalizeText(name));
    if (match) {
      let tsn = match.tsn;
      let usage = await itisQuery('getTaxonomicUsageFromTSN', { tsn }, debug);

      if (usage.taxonUsageRating === 'not accepted' || usage.taxonUsageRating === 'invalid') {
        let result = await itisQuery('getAcceptedNamesFromTSN', { tsn }, debug);
        let accepted = result.acceptedNames.filter(o => o);

        // Don't arbitrarily choose if ITIS provides multiple accepted taxa.
        if (accepted.length !== 1) {
          // TODO should we though?
          console.log(`ITIS: ${name} has ${accepted.length} accepted-name targets`);
          return [];
        }
        tsn = accepted[0].acceptedTsn;
      }

      // get common names
      let result = await itisQuery('getCommonNamesFromTSN', { tsn: match.tsn }, debug);
      return result.commonNames.filter(o => o && o.language == 'English').map(o => sentenceCase(o.commonName));
    }
  }

  return [];
}

function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

////////////////////////////////////////


async function main() {
  let arg = process.argv[2];
  let result = await CommonNames.lookup(arg, true);
  console.log(result);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

