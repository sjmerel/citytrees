#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {

  let endpoint = 'https://gis.santamonica.gov/server/rest/services/Trees/MapServer/0';

  let rows = await CityUtil.fetchArcGis(endpoint, {
      fields: 'botanicalname,latitude,longitude',
      where: "botanicalname IS NOT NULL AND botanicalname <> ''",
    }
  );

  let trees = rows.map(o => ({
    name: o.attributes.botanicalname,
    lat: o.attributes.latitude,
    lon: o.attributes.longitude,
  }));

  fs.writeFileSync(path.join(__dirname, 'santamoni_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
