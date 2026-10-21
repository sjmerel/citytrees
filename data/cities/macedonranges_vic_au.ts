#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';

// the source coordinates are projected (MGA zone 55, EPSG:28355), not degrees
const MGA55 = '+proj=utm +zone=55 +south +ellps=GRS80 +units=m +no_defs';

async function main() {
  let endpoint = 'https://data.gov.au/data/dataset/0fa43ec5-d4d3-48f2-aa53-7879aad1d178/resource/ebc196ee-19ba-46da-a787-055b7bae9e90/download/mrsc_trees.geojson';
  let response = await axios.get(endpoint, { maxContentLength: Infinity });
  let trees = [];

  for (let feature of response.data.features) {
    let [x, y] = feature.geometry?.coordinates ?? [];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    let [lon, lat] = proj4(MGA55, 'WGS84', [x, y]);
    let genus = (feature.properties.genus ?? '').trim();
    let species = (feature.properties.species ?? '').trim().toLowerCase();
    if (!genus || /^(unknown|not recorded|vacant.*)$/i.test(genus) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    // species may be empty, "sp." or "Unknown" (genus-only)
    let name = /^(|sp\.?|spp\.?|species|unknown)$/i.test(species) ? genus : `${genus} ${species}`;
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'macedonranges_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
