#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';
import proj4 from 'proj4';

async function main() {

  // data from: https://opendata-hub.beverlyhills.org/datasets/fdf9005441a947a482175f7e5e0f3762_1

  let parser = fs.createReadStream('./beverlyhills.csv').pipe(
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

    let x = Number(row.X);
    let y = Number(row.Y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      ++skipped;
      continue;
    }

    let [lon, lat] = proj4('EPSG:3857', 'EPSG:4326', [x, y]);
    let tree = {
      lat,
      lon,
      name: row.BOTANICAL
    };

    if (!tree.name || !tree.lat || !tree.lon) {
      ++skipped;
      continue;
    }

    trees.push(tree);
  }

  console.log(`processed ${n}, skipped ${skipped}`);

  fs.writeFileSync('beverlyhills.json', JSON.stringify(trees, null, 2));
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


