#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {

  // data from: https://data.cityofnewyork.us/Environment/2015-Street-Tree-Census-Tree-Data/uvpi-gqnh

  let parser = fs.createReadStream('./newyorkcity.csv').pipe(
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

    let name = String(row.spc_latin ?? '').trim();
    let lat = Number(row.latitude);
    let lon = Number(row.longitude);
    if (row.status !== 'Alive' || !name || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat === 0 || lon === 0) {
      ++skipped;
      continue;
    }

    trees.push({ lat, lon, name });
  }

  console.log(`processed ${n}, skipped ${skipped}`);
  fs.writeFileSync('newyorkcity.json', JSON.stringify(trees, null, 2));
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
