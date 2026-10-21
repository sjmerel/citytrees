#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services8.arcgis.com/F06fszt0Xp6od73d/arcgis/rest/services/Trees_public_7efb27e098334e40b09093698f30b8b0/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: `${o.attributes.genus.trim()} ${(o.attributes.species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'phoenixville_pa_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
