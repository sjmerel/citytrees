#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://data.gov.au/data/dataset/f3c88ce7-504b-4ef7-907f-686037f7420c/resource/ade7df10-867a-42a7-adeb-99570c36ae83/download/yarra-street-and-park-trees.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let [lat, lon] = (row['lat, lon'] ?? '').split(',').map(Number);
    let genus = (row.genus ?? '').trim();
    // species is abbreviated, e.g. "P. x acerifolia" or "E. leucoxylon 'Euky Dwarf'"
    let species = (row.species ?? '').trim().replace(/\s+/g, ' ');
    if (!genus || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    let rest = species.replace(/^[A-Z]\.\s*/, '');
    let name = /^(sp\.?|spp\.?)?$/i.test(rest) ? genus : `${genus} ${rest}`;
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'yarra_vic_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
