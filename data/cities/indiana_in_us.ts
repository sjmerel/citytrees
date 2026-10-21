#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Indiana University Environmental Resilience Institute compilation of Indiana municipal inventories
// (active trees only). Highland is excluded because it has its own source.
async function main() {
  let endpoint = 'https://services.arcgis.com/tKsJAIiLjd90D5q2/arcgis/rest/services/Bloomington_and_Indianapolis_Tree_Inventories/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES,GENUS',
    where: "LOCATION <> 'Highland' AND (SPECIES IS NOT NULL OR GENUS IS NOT NULL)",
    returnGeometry: true
  });

  let clean = (name: string) => name.trim().replace('Ã—', 'x').replace('×', 'x').replace(/\s+(spp\.?|sp\.?)$/i, '');
  let trees = rows.filter(o => o.geometry).map(o => ({
    name: clean(o.attributes.SPECIES ?? '') || clean(o.attributes.GENUS ?? ''),
    lat: o.geometry.y,
    lon: o.geometry.x
  })).filter(t => t.name);

  fs.writeFileSync(path.join(__dirname, 'indiana_in_us.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
