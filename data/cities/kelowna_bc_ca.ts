#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://geoportal.kelowna.ca/arcgis/rest/services/ArcGISOnline/OpenData_Environment/MapServer/17';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> ''",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    let genus = a.Genus.trim(); let sp = (a.Species ?? '').trim().toLowerCase(); name = sp && !['none', 'unknown', 'spp.', 'sp.'].includes(sp) ? `${genus} ${sp}` : genus;
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'kelowna_bc_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
