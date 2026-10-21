#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  let endpoint = 'https://data.gov.au/data/dataset/e794491f-2eb7-4035-8b0c-f7248c28feda/resource/8f46fcc0-778c-44d3-bba6-38ac9120123e/download/greater_shepparton_city_council_street_and_park_trees.json';
  let response = await axios.get(endpoint, { maxContentLength: Infinity });
  let trees = [];

  for (let feature of response.data.features) {
    let [lon, lat] = feature.geometry?.coordinates ?? [];
    let genus = (feature.properties.genus ?? '').trim();
    let species = (feature.properties.species ?? '').trim().toLowerCase();
    if (!genus || /^(unknown|not recorded|vacant.*)$/i.test(genus) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    // species may be empty, "sp." or "Unknown" (genus-only)
    let name = /^(|sp\.?|spp\.?|species|unknown)$/i.test(species) ? genus : `${genus} ${species}`;
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'shepparton_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
