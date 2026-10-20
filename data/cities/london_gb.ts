#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

async function main() {
  let endpoint = 'https://data.london.gov.uk/download/2r45m/e62a6a1f-390d-4193-ae32-3aabd9846f36/Borough_tree_list_2025Nov.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let lat = parseFloat(row.lat);
    let lon = parseFloat(row.lon);
    if (!row.taxon_species || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name: row.taxon_species.trim(), lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'london_gb.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
