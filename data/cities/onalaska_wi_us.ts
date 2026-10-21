#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/VMiHKHuCDWhb8bY8/arcgis/rest/services/TreeInventory_Public/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry && !/^(n\/a|unknown|tbd)/i.test(o.attributes.Genus.trim()))
    .map(o => ({
      name: `${o.attributes.Genus.trim()} ${(o.attributes.Species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'onalaska_wi_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
