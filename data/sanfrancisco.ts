#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://data.sfgov.org/resource/tkzw-k3nq.json';

  let rows = await DataUtil.fetchSocrata(endpoint, {
      '$select': 'latitude,longitude,species',
      '$order': 'treeid',
      '$where': "planttype = 'Tree' AND latitude IS NOT NULL AND longitude IS NOT NULL AND species IS NOT NULL"
    }
  );

  let trees = rows.map(o => ({
    name: o.species.split(' :: ')[0].trim(),
    lat: parseFloat(o.latitude),
    lon: parseFloat(o.longitude)
  }));

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
