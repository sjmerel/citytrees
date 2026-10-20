#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services1.arcgis.com/WHM6qC35aMtyAAlN/arcgis/rest/services/BPR_Park_And_Street_Trees/FeatureServer/1';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Status = 'Active' AND Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${o.attributes.Genus.trim()} ${(o.attributes.Species ?? '').trim()}`.trim().toLowerCase().replace(/^./, c => c.toUpperCase()),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'boise_id_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
