// Cleans raw botanical names from city data before canonicalization: strips cultivars,
// trade-name suffixes and placeholders ("spp."), leaving the most specific botanical name.

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function cleanName(raw: string): string {
  let name = stripCultivar(raw.trim());
  name = stripTrailingParenthetical(name);
  name = stripTradeMarks(name);
  name = stripCultivarWords(name);
  name = stripPlaceholders(name);
  return normalizeCase(name);
}

// Cornus kousa 'Champion's Gold' -> Cornus kousa
// Ulmus x 'Morton' (Accolade TM) -> Ulmus x
export function stripCultivar(name: string): string {
  // normalize quotes
  name = name.replace(/(?:\\"|["`‘’“”])/g, "'");

  // handle possessives
  //  Cornus kousa 'Champion's Gold' -> Cornus kousa 'Champion’s Gold'
  name = name.replace(/(\S)'(s)(?=[\s A-Z]|$)/g, '$1’$2');

  // a quote after whitespace, or directly after an abbreviation period (Ginkgo b.'The President')
  const cultivarStart = name.search(/\s+'|(?<=\.)'(?=[A-Z])/);
  if (cultivarStart < 0) {
    return name;
  }

  // text after the cultivar might name another taxon ("Platanus 'Colombia' or Platanus racemosa")
  const tail = name.slice(cultivarStart).replace(/'[^']*'?/, '');
  if (/\b(?:or|and)\s+[A-Z][a-z]+/.test(tail)) {
    return name;
  }

  return name.slice(0, cultivarStart).trimEnd();
}

// Acer x freemanii (A. rubrum x saccharinum) -> Acer x freemanii
// Ginkgo biloba (male) -> Ginkgo biloba
function stripTrailingParenthetical(name: string): string {
  let stripped = name.replace(/\s*\([^()]*\)?\s*$/, '').trimEnd();
  // "Ulmus pumila x (pumila x minor)": the parenthetical completes a hybrid, so keep it
  if (!stripped.length || / [xX×]$/.test(stripped)) {
    return name;
  }
  return stripped;
}

// Pyrus calleryana Aristocrat TM -> Pyrus calleryana Aristocrat
function stripTradeMarks(name: string): string {
  let stripped = name.replace(/\s*(?:\((?:R|TM)\)|[®™]|\bTM)\s*$/, '').trimEnd();
  return stripped.length ? stripped : name;
}

// A capitalized word (or words) after a lower-case epithet is a cultivar name:
//  Acer rubrum Red Sunset -> Acer rubrum
// Hybrid markers, ranks and placeholders are not cultivars.
const NOT_CULTIVAR_WORDS = /^(?:X|Var|Subsp|Ssp|Spp|Sp|Species|Hybrid|Group|Agg|F|Cv)\.?$/;
function stripCultivarWords(name: string): string {
  const m = name.match(/^([A-Z][a-z]+) ([a-z][a-z-]*[a-z])((?: [A-Z][A-Za-z0-9’-]*)+)$/);
  if (!m || m[2] === 'x') {
    return name;
  }
  if (m[3].trim().split(' ').some(word => NOT_CULTIVAR_WORDS.test(word))) {
    return name;
  }
  return `${m[1]} ${m[2]}`;
}

// remove trailing "spp.", "species", a dangling hybrid "x" and so on, leaving the genus
function stripPlaceholders(name: string): string {
  let stripped = name;
  let prev;
  do {
    prev = stripped;
    stripped = stripped.replace(/\s+(?:x|×|sp|spp|sps|ssp|species)\.?$/i, '');
  } while (stripped != prev && stripped.includes(' '));
  return stripped == prev || stripped.length ? stripped : name;
}

// "Cercis Canadensis" -> "Cercis canadensis", "Crataegus x Lavallei" -> "Crataegus x lavallei":
// a single capitalized epithet is a typo of case
function normalizeCase(name: string): string {
  name = name.replace(/[\s\u00a0\u200b-\u200f]+/g, ' ').trim();
  return name.replace(/^([A-Za-z]+(?: x)?) ([A-Z][a-z]+)$/, (_, genus, epithet) => `${genus} ${epithet.toLowerCase()}`);
}
