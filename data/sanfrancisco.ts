#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {

  // data from: https://data.sfgov.org/City-Infrastructure/Street-Tree-List/tkzw-k3nq

  let parser = fs.createReadStream('./sanfrancisco.csv').pipe(
    parse({
      columns: true,
      trim: true,
      cast: true,
      skip_empty_lines: true,
    })
  );

  let n = 0;
  let skipped = 0;
  let trees = [];
  for await (let row of parser) {
    ++n;
    if (n % 10000 == 0) {
      console.log(n);
    }

    if (row.PlantType !== 'Tree') {
      ++skipped;
      continue;
    }

    let name = String(row.qSpecies ?? '').split(' :: ')[0].trim();
    let lat = Number(row.Latitude);
    let lon = Number(row.Longitude);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) {
      ++skipped;
      continue;
    }

    trees.push({ lat, lon, name });
  }

  console.log(`processed ${n}, skipped ${skipped}`);
  fs.writeFileSync('sanfrancisco.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();
