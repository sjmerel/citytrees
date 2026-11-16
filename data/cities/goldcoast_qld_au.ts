#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: { GENUS: string | null; SPECIES: string | null; HEALTH: string | null };
  geometry: { x: number; y: number } | null;
}

// This public export dates to 2021. Most records have no botanical identification.
// Undocumented health codes are omitted rather than guessed. Blank health is unknown.
// TREE_REG_REASON_FOR_REMOVAL also contains numeric IDs on healthy trees, not a removal flag.
export function treeSite(row: Tree) {
  let p = row.attributes;
  let health = p.HEALTH?.trim() ?? '';
  if (health && !/^(?:Excellent|Good|Fair|Poor|Very poor|In Decline)$/i.test(health)) return;
  let genus = p.GENUS?.replace(/\s+/g, ' ').trim();
  if (!genus || /^(?:Unknown|UNIDENTIFIED|NOT_TREE|Dead tree|Stump|Palm|Arecaceae|Bamboo|Oleander|Cuban|Guava|Wattle|Poinciana|Pigeonberry Ash|Fangapani|Lopsided|Are|Electron|x|<Null>|_)$/i.test(genus)) return;
  if (/^(?:Bambusa|Bougainvillea|Bouganvillea|Doryanthes|Duranta|Murraya|Musa|Nerium|Philodendron|Ravenala)\b/i.test(genus)) return;
  // Two rows use a complete binomial in GENUS; malformed multiword labels are not genera.
  if (!/^[A-Za-z]+$/.test(genus) && !/^Lophostemon (?:confertus|suaveolens)$/i.test(genus)) return;
  let species = p.SPECIES?.replace(/\s+/g, ' ').trim() ?? '';
  if (/^(?:spp?\.?|Unknown|<Null>|_)$/i.test(species)) species = '';
  // Eight records have the genus and epithet in each other's fields.
  if (/^Cunninghamii$/i.test(genus) && /^Araucaria$/i.test(species)) {
    genus = 'Araucaria';
    species = 'cunninghamii';
  }
  let name = genus;
  if (species && !genus.includes(' ')) {
    name = species.toLowerCase().startsWith(`${genus.toLowerCase()} `) ? species : `${genus} ${species}`;
  }
  if (/^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(row.geometry);
  let { x: lon, y: lat } = row.geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > -28.3 && lat < -27.6 && lon > 153 && lon < 153.65);
  return { lat, lon, name };
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://services.arcgis.com/3vStCH7NDoBOZ5zn/arcgis/rest/services/Urban_Forest/FeatureServer/0',
    { fields: 'OBJECTID,OBJECTID_1,GENUS,SPECIES,HEALTH', where: "GENUS IS NOT NULL AND GENUS <> ' ' AND GENUS <> 'Unknown'",
      returnGeometry: true, verifyComplete: true });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row);
    return tree ? [tree] : [];
  });
  assert(trees.length > 100000, 'Unexpectedly few Gold Coast trees');
  fs.writeFileSync(path.join(__dirname, 'goldcoast_qld_au.json'), JSON.stringify(trees));
  console.log(`goldcoast_qld_au: ${trees.length} trees; ${rows.length - trees.length} candidate records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
