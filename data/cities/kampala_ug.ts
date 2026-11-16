#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    tree_speci: string | null;
    Tree_Spe_1: string | null;
    tree_species: string | null;
    Tree_Species_Name: string | null;
    tree_healt: string | null;
    Tree_Hea_1: string | null;
    tree_health: string | null;
    Tree_Health_Status: string | null;
  };
  geometry: { x: number; y: number } | null;
}

// Public Kampala Tree Audit 2025 copy, describing KCCA Landscape team surveys.
// https://www.arcgis.com/home/item.html?id=b520ea196dfd463ca8f2f45e3261641d
// Publisher affiliation and redistribution permission remain unconfirmed.
// Four merged schemas use mutually exclusive botanical-name fields.
// Health code 5 consistently means dead; codes 2/3 have schema-dependent meanings.
// Keep co-located observations for process.ts to reconcile after canonicalization.
export function treeSite(row: Tree) {
  let p = row.attributes;
  let health = [p.tree_healt, p.Tree_Hea_1, p.tree_health, p.Tree_Health_Status]
    .map(value => value?.trim());
  if (health.some(value => value !== undefined && /^(?:5|Dead(?:_tree)?)$/i.test(value))) return;
  let names = [p.tree_speci, p.Tree_Spe_1, p.tree_species, p.Tree_Species_Name]
    .map(value => value?.replace(/\s+/g, ' ').trim()).filter(value => !!value);
  assert(names.length <= 1, 'Multiple Kampala botanical-name fields populated');
  let name = names[0];
  if (!name || /^Unidentified\b/i.test(name)) return;
  if (/^(?:Bamboosoidae|Bambusa|Bougainvillea|Musa|Ravenala)\b/i.test(name) ||
      /^Hibiscus rosa-sinensis\b/i.test(name)) return;
  assert(/^[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Kampala botanical name: ${name}`);
  assert(row.geometry);
  let { x: lon, y: lat } = row.geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 0.2 && lat < 0.42 && lon > 32.5 && lon < 32.7);
  return { lat, lon, name };
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://services2.arcgis.com/v3NaWnqsu9WnV5NK/arcgis/rest/services/Kampala_Tree_Audit_2025_WFL1/FeatureServer/1',
    { fields: 'OBJECTID,tree_speci,Tree_Spe_1,tree_species,Tree_Species_Name,tree_healt,Tree_Hea_1,tree_health,Tree_Health_Status',
      returnGeometry: true, verifyComplete: true });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row);
    return tree ? [tree] : [];
  });
  assert(trees.length >= 5000, 'Kampala inventory has unexpectedly few usable trees');
  fs.writeFileSync(path.join(__dirname, 'kampala_ug.json'), JSON.stringify(trees, null, 2));
  console.log(`kampala_ug: ${trees.length} trees; ${rows.length - trees.length} records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
