#!/usr/bin/env npx tsx

import { fileURLToPath } from 'node:url';
import assert, { fail } from 'node:assert';
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

const foo = new Set([
   'SUBGENUS',
   'SECTION',
   'SUBSECTION',
   'SERIES',
   'SUBSERIES',
   'SPECIES_AGGREGATE',
  'CULTIVAR'
]);

export namespace Canonicalize {

  export async function canonicalizeName(name: string, debug: boolean = false) {
    let response = await axios.get('https://api.gbif.org/v2/species/match', {
      params: { 
        scientificName: sentenceCase(name), 
        kingdom: 'Plantae' 
      } 
    });
    let result = response.data;
    if (debug) { console.log(result); }

    let taxon = result.acceptedUsage ?? result.usage;
    if (foo.has(taxon.rank)) {
      console.log('*****');
      console.log(result);
      fail();
    }
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
        name: canonicalizeCase(name),
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

}


////////////////////////////////////////

function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function addMarker(name: string, marker: string): string {
  let components = name.split(' ');
  return components.splice(components.length, 0, marker).join(' ');
}

function canonicalizeCase(name: string): string {
  // Capitalize genera: Acer rubrum, Acer × freemanii, × Chitalpa tashkentensis,
  // and Acer rubrum × Acer saccharinum. Keep omitted-genus epithets lowercase
  // (Acer rubrum × saccharinum), as well as rank markers (subsp., var., f.).
  let components = name.toLowerCase().split(' ');
  let firstGenus = components[0] === '×' ? 1 : 0;
  components[firstGenus] = sentenceCase(components[firstGenus]);
  for (let i = firstGenus + 1; i < components.length - 2; ++i) {
    if (components[i] === '×' &&
        components[i + 2] !== '×' &&
        !/^(subsp|subvar|var|subf|f)\.$/.test(components[i + 2])) {
      components[i + 1] = sentenceCase(components[i + 1]);
    }
  }
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
