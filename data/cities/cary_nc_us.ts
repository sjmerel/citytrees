#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Official Cary Public Trees layer: partial street/park coverage, largely a 2016
// Bartlett survey marked as needing ground-truthing, with some 2025-2026 inspections.
// Use the source's botanical species table when scientific_name is missing.
// Some codes have no crosswalk entry, or explicitly map to "unknown"; omit them.
async function main() {
  let endpoint = 'https://maps-apis.carync.gov/server/rest/services/ParksRecreation/CaryTrees/FeatureServer';
  let [rows, species] = await Promise.all([
    CityUtil.fetchArcGis(`${endpoint}/0`, {
      fields: 'scientific_name,species_code',
      where: "(health_condition IS NULL OR health_condition <> 'dead') AND (primary_maintenance_need IS NULL OR primary_maintenance_need <> 'stump_removal') AND (secondary_maintenance_need IS NULL OR secondary_maintenance_need <> 'stump_removal')",
      returnGeometry: true
    }),
    CityUtil.fetchArcGis(`${endpoint}/1`, { fields: 'speciescode,scientific' })
  ]);
  let names = new Map<string, string>();
  for (let row of species) {
    let { speciescode, scientific } = row.attributes;
    assert(typeof speciescode === 'string' && typeof scientific === 'string');
    assert(!names.has(speciescode), `Duplicate Cary species code: ${speciescode}`);
    names.set(speciescode, scientific);
  }

  let unidentified = 0;
  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 35.6 && o.geometry.y < 36 &&
      o.geometry.x > -79 && o.geometry.x < -78.65)
    .map(o => {
      let name = o.attributes.scientific_name?.trim();
      if (!name && o.attributes.species_code) {
        name = names.get(o.attributes.species_code);
      }
      if (!name || /^(unknown|n\/a)$/i.test(name.trim())) {
        ++unidentified;
        return null;
      }
      return { lat: o.geometry.y, lon: o.geometry.x, name: name.replace(/\s+/g, ' ') };
    })
    .filter(o => o !== null);

  fs.writeFileSync(path.join(__dirname, 'cary_nc_us.json'), JSON.stringify(trees, null, 2));
  console.log(`omitted ${unidentified} Cary sites without a verified botanical name`);
  console.log(`cary_nc_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
