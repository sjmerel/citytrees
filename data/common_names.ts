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
  timeout: 15000,

  // Disable keep-alive to prevent "socket hang up" from stale server resets
  httpAgent: new http.Agent({ keepAlive: false }),
  httpsAgent: new https.Agent({ keepAlive: false }),
});


export namespace CommonNames {

  export async function lookup(name: string, debug: boolean = false) {
    let result = await doLookup(name, debug);
    if (result) { return result; }

    if (name.includes(Normalize.hybridMarker)) {
      // handle hybrids; lookups usually only succed with latin 'X' marker or no hybrid marker
      result = await doLookup(name.replaceAll(Normalize.hybridMarker, 'X'), debug);
      if (result) { return result; }

      // if lookup didn't return results, try without hybrid marker.
      //   Only remove a named-hybrid marker (Acer × freemanii or × Chitalpa tashkentensis),
      //   not a cross in a formula (Acer rubrum × Acer saccharinum).
      let components = name.split(/\s+/);
      let markerIndex = components.indexOf(Normalize.hybridMarker);
      if (markerIndex >= 0 && markerIndex <= 1 && components.lastIndexOf(Normalize.hybridMarker) === markerIndex) {
        components.splice(markerIndex, 1);
        let newName = components.join(' ');
        console.log(`    retrying as: ${newName}`);
        return lookup(newName, debug);
      }
      return null;
    }
    else {
      // try less specific names
      let speciesName = name.replace(/\s+(?:subsp|ssp|subvar|var|subf|f)\.?\s+.*$/i, '');
      if (speciesName !== name) {
        console.log(`    retrying as: ${speciesName}`);
        result = await doLookup(speciesName, debug);
        if (result) { return result; }
      }

      let genus = speciesName.split(/\s+/)[0];
      if (genus === speciesName) {
        return null;
      }
      else {
        console.log(`    retrying as: ${genus}`);
        return await doLookup(genus, debug);
      }
    }
  }

}


////////////////////////////////////////

async function itisQuery(endpoint: string, params: any, debug = false) {
  let response;
  for (let attempt = 0; ; ++attempt) {
    try {
      response = await itisClient.get(`${urlBase}/${endpoint}`, { params: params, timeout: 30000 });
      break;
    }
    catch (error) {
      if (!axios.isAxiosError(error)) { throw error; }
      let status = error.response?.status;
      let transient = status === 429 || (status !== undefined && status >= 500) ||
        ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED', 'EPIPE'].includes(error.code ?? '');
      if (!transient || attempt >= 3) { throw error; }
      let delay = 1000 * 2 ** attempt;
      console.log(`ITIS: ${endpoint} failed (${status ?? error.code}), retrying in ${delay / 1000}s (${attempt + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
          return null;
        }
        tsn = accepted[0].acceptedTsn;
      }

      // get common names
      let result = await itisQuery('getCommonNamesFromTSN', { tsn }, debug);
      let commonNames = result.commonNames.filter(o => o && o.language == 'English').map(o => sentenceCase(o.commonName)).filter(o => o !== name);
      if (commonNames.length) {
        return {
          matchedName: name,
          commonNames: commonNames,
        }
      }
      else {
        return null;
      }
    }
  }

  return null;
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
