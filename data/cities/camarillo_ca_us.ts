#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {

  let endpoint = 'https://services3.arcgis.com/EKquOdzev2aNwKyB/arcgis/rest/services/Trees/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'BOTANICAL',
      where: "BOTANICAL IS NOT NULL AND BOTANICAL <> '' AND BOTANICAL NOT LIKE '%acant%'",
      returnGeometry: true
    }
  );

  let trees = rows.filter(o => o.geometry).map(o => ({
    lat: o.geometry.y,
    lon: o.geometry.x,
    name: o.attributes.BOTANICAL.trim()
  }));

  trees = trees.filter(o => !/^(stump|dead tree|unknown|none|unsuitable site)\b/i.test(o.name));

  fs.writeFileSync(path.join(__dirname, 'camarillo_ca_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
