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

  // data from:
  //   https://geohub.lacity.org/datasets/lahub::trees-bureau-of-street-services/explore?location=34.019543%2C-118.412051%2C10
  //
  // NOTE:
  //   don't use this one:
  //      https://data.lacity.org/City-Infrastructure-Service-Requests/Street-Tree-Inventory-1990s/vt5t-mscf/about_data
  //   it has more data but the latitude & longitude aren't precise enough for display

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
  let trees: { lat: number; lon: number; name: string }[] = [];
  for await (let row of parser) {
    ++n;
    if (n % 10000 == 0) {
      console.log(n);
    }

    if (row.Type_Description !== 'Tree' && row.Type_Description !== 'Tree in Tree Well') {
      ++skipped;
      continue;
    }

    let tooltip = String(row.TOOLTIP ?? '').replace(/\\n/g, '\n');
    let botanicalName = tooltip.match(/(?:^|\n)Botanical Name:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (!botanicalName || botanicalName === 'Not Specified' || botanicalName === 'NULL') {
      ++skipped;
      continue;
    }

    let x = Number(row.X);
    let y = Number(row.Y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      ++skipped;
      continue;
    }

    let [lon, lat] = proj4('EPSG:2229', 'EPSG:4326', [x, y]);
    let tree = {
      lat,
      lon,
      name: botanicalName
    };

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
