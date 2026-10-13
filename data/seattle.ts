#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {
  let parser = fs.createReadStream('./seattle.csv').pipe(
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

    let tree = {
      lat: row.SHAPE_LAT,
      lon: row.SHAPE_LNG,
      name: row.SCIENTIFIC_NAME
    };

    if (!tree.name || !tree.lat || !tree.lon) {
      ++skipped;
      continue;
    }

    trees.push(tree);
  }

  console.log(`processed ${n}, skipped ${skipped}`);

  fs.writeFileSync('seattle.json', JSON.stringify(trees, null, 2));
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



