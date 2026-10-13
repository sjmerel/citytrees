#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';

async function main() {
  let parser = fs.createReadStream('./losangeles.csv').pipe(
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

    if (row.Botanical == 'NULL') {
      ++skipped;
      continue;
    }

    let tree = {
      lat: row.X,
      lon: row.Y,
      name: row.Botanical
    };

    if (!tree.name || !tree.lat || !tree.lon) {
      ++skipped;
      continue;
    }

    trees.push(tree);
  }

  console.log(`processed ${n}, skipped ${skipped}`);

  fs.writeFileSync('losangeles.json', JSON.stringify(trees, null, 2));
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

