#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://gispub.normal.org/tongis/rest/services/Hosted/Town_of_Normal_Tree_Inventory_Public/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'genus,species,spacestatus,treestatus',
    where: "spacestatus = 'Planted' AND treestatus = 'Active' AND genus IS NOT NULL AND genus <> ''",
    returnGeometry: true
  });

  // species is sometimes the full binomial or "<genus> species"
  let trees = rows.map(o => {
    let genus = o.attributes.genus.trim();
    let species = (o.attributes.species ?? '').trim();
    let name = species.toLowerCase().startsWith(genus.toLowerCase()) ? species : `${genus} ${species}`;
    return {
      name: name.replace(/ species$/i, ' spp.').trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'normal_il_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
