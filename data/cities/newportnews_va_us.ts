#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// City's reviewed Public Trees view, not the separate unreviewed crowdsourced
// collection or LiDAR tree-cover layer. Partial coverage; survey dates are absent.
// 2024-2026 creation/edit dates do not establish when trees were inspected.
async function main() {
  let endpoint = 'https://services6.arcgis.com/SiUAoHzWN11AIADA/arcgis/rest/services/Trees_Public_View/FeatureServer/1';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'genus,species',
    where: "publicview = 'Yes' AND genus IS NOT NULL AND (Condition IS NULL OR Condition <> 'Dead')",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && o.geometry.y > 36.9 && o.geometry.y < 37.3 &&
      o.geometry.x > -76.7 && o.geometry.x < -76.35)
    .map(o => {
      let genus = o.attributes.genus.trim();
      let species = o.attributes.species?.trim();
      return {
        lat: o.geometry.y, lon: o.geometry.x,
        name: species && !/^(NA|spp?\.)$/i.test(species) ? `${genus} ${species}` : genus,
        genus
      };
    })
    .filter(o => o.genus && !/^(NA|Magnoliopsida|Pinopsida)$/i.test(o.genus))
    .map(({ lat, lon, name }) => ({ lat, lon, name }));

  fs.writeFileSync(path.join(__dirname, 'newportnews_va_us.json'), JSON.stringify(trees, null, 2));
  console.log(`newportnews_va_us: ${trees.length} trees`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
