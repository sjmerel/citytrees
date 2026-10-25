#!/usr/bin/env npx tsx

import { fileURLToPath } from 'node:url';
import process from 'node:process';
import axios from 'axios';
import { Normalize } from './normalize';

const ACCEPTED_RANKS = new Set([
  'GENUS',
  // 'SUBGENUS',
  // 'SECTION',
  // 'SUBSECTION',
  // 'SERIES',
  // 'SUBSERIES',
  'SPECIES',
  // 'SPECIES_AGGREGATE',
  'SUBSPECIES',
  'SUBVARIETY',
  'VARIETY',
  'SUBFORM',
  'FORM',
  //'CULTIVAR'
]);


export namespace Canonicalize {

  export async function canonicalizeName(name: string, debug: boolean = false) {
    let response = await axios.get('https://api.gbif.org/v2/species/match', {
      params: { 
        scientificName: canonicalizeCase(name), 
        kingdom: 'Plantae' 
      } 
    });
    let result = response.data;
    if (debug) { console.log(result); }

    let taxon = result.acceptedUsage ?? result.usage;
    if (ACCEPTED_RANKS.has(taxon.rank)) {
      let name = Normalize.normalizeText(taxon.canonicalName);

      // add marker
      let marker = null;
      switch (taxon.rank) {
        case 'SUBSPECIES': marker = 'subsp.'; break;
        case 'SUBVARIETY': marker = 'subvar.'; break;
        case 'VARIETY': marker = 'var.'; break;
        case 'SUBFORM': marker = 'subf.'; break;
        case 'FORM': marker = 'f.'; break;
      }
      if (marker) { 
        name = addMarker(name, marker);
      }

      return {
        name: name,
        confidence: result.diagnostics.confidence
      };
    }
    else {
      return {
        name: null,
        confidence: 0
      };
    }
  }

  export function canonicalizeCase(name: string): string {
    // Capitalize genera, e.g.:
    //   Acer rubrum
    //   Acer × freemanii
    //   × Chitalpa tashkentensis,
    //   Acer rubrum × Acer saccharinum
    //   Acer rubrum × Acer × freemanii.
    // Keep omitted-genus epithets lowercase (Acer rubrum × saccharinum), as well as rank markers (subsp., var., f.).
    let components = name.toLowerCase().split(' ');
    let firstGenus = components[0] === '×' ? 1 : 0;
    components[firstGenus] = sentenceCase(components[firstGenus]);
    for (let i = firstGenus + 1; i < components.length - 2; ++i) {
      if (i === firstGenus + 1) { continue; } // A marker immediately after the genus names a hybrid.
      let epithet = components[i + 2] === '×' ? components[i + 3] : components[i + 2];
      if (components[i] === '×' &&
          epithet && epithet !== '×' &&
          !/^(subsp|subvar|var|subf|f)\.$/.test(epithet)) {
        components[i + 1] = sentenceCase(components[i + 1]);
        if (components[i + 2] === '×') { i += 2; }
      }
    }
    return components.join(' ');
  }
}


////////////////////////////////////////

function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function addMarker(name: string, marker: string): string {
  let components = name.split(' ');
  components.splice(components.length-1, 0, marker);
  return components.join(' ');
}


////////////////////////////////////////


async function main() {
  let arg = process.argv[2];
  let result = await Canonicalize.canonicalizeName(arg, true);
  console.log(result);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
