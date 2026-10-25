#!/usr/bin/env npx tsx

import { fileURLToPath } from 'node:url';
import process from 'node:process';

export namespace Normalize {

  // unicode multiplication sign
  export const hybridMarker = '×';

  export function normalizeText(name: string): string {
    name = name.toLowerCase();
    name = normalizeSpaces(name);

    // replace runs of various quotes with single quotes
    name = name.replace(/(?:['"`“”‘’])+/g, "'");

    name = normalizeHybridMarker(name);

    return name;
  }

  export function normalizeHybridMarker(name: string): string {
    // replace "x" with unicode × for hybrids
    name = name.replace(' x ', ` ${hybridMarker} `);
    name = name.replace(/ x$/, ` ${hybridMarker}`);
    name = name.replace(/^x /, `${hybridMarker} `);
    return name;
  }

  export function normalizeName(name: string): string {
    name = stripCultivar(name);

    // remove "species", "spp", etc at end
    name = name.replace(/(?:^|\s+)(?:genus|species|spp\.?|sp\.?|other|unknown)$/, '');

    return normalizeSpaces(name);
  }

}

////////////////////////////////////////


// remove cultivar
//   pyrus calleryana 'bradford' -> pyrus calleryana
//   (we could keep cultivar names for display, but they can't be normalized with the scientific databases we're using.)
function stripCultivar(name: string): string {
  // remove anything in parentheses
  name = name.replace(/\(.*\)/, '');
  name = normalizeSpaces(name); // since the previous step might have created runs of spaces

  // handle possessives
  //  cornus kousa 'champion's gold' -> cornus kousa 'champions gold'
  name = name.replace(/(\S)'s /g, '$1s ');
  //  acer saccharum 'temple's' -> acer saccharum 'temples'
  name = name.replace(/(\S)'s'/g, '$1s');

  // if there are two quotes and one is at the end, that's almost definitely a cultivar.
  //   pyrus calleryana 'bradford' -> pyrus calleryana
  let quotePos = [...name.matchAll(/'/g)].map(o => o.index);
  switch (quotePos.length) {
    case 1: {
      // assume truncated (e.g. "pyrus calleryana 'bradf"); delete to end
      name = name.slice(0, quotePos[0]);
      break;
    }
    case 2: {
      // assume quoted string is cultivar
      name = name.slice(0, quotePos[0]) + name.slice(quotePos[1]+1);
      break;
    }
    case 3: {
      // assume nested quote in cultivar (e.g. "plumeria rubra 'pu'u kahea'")
      name = name.slice(0, quotePos[0]) + name.slice(quotePos[2]+1);
      break;
    }
  }

  return name;
}

// replace runs of whitespace with a single space, and trim
function normalizeSpaces(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

////////////////////////////////////////


async function main() {
  let arg = process.argv[2];
  console.log(Normalize.normalizeName(arg));
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
