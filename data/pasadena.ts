#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { parse } from 'csv-parse';
import proj4 from 'proj4';

proj4.defs(
  'EPSG:2229',
  '+proj=lcc +lat_1=35.46666666666667 +lat_2=34.03333333333333 ' +
    '+lat_0=33.5 +lon_0=-118 +x_0=2000000 +y_0=500000 ' +
    '+datum=NAD83 +units=us-ft +no_defs +type=crs'
);

async function main() {

  // data from: https://data.cityofpasadena.net/datasets/593b88391b614123890f54a1db8fbf55_0/about

  let parser = fs.createReadStream('./pasadena.csv').pipe(
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

    if (row.Classification_Text !== 'Street Tree' || row.Status_Text !== 'Active') {
      ++skipped;
      continue;
    }

    let x = Number(row.X_Coordinate);
    let y = Number(row.Y_Coordinate);
    let name = [row.Genus, row.Species]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');
    if (!Number.isFinite(x) || !Number.isFinite(y) || !name) {
      ++skipped;
      continue;
    }

    let [lon, lat] = proj4('EPSG:2229', 'EPSG:4326', [x, y]);
    trees.push({ lat, lon, name });
  }

  console.log(`processed ${n}, skipped ${skipped}`);
  fs.writeFileSync('pasadena.json', JSON.stringify(trees, null, 2));
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
