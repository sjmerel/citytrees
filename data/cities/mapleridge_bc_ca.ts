#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://geoservices.mapleridge.ca/server/rest/services/DataCatalog/Environment/MapServer/5';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Genus,Species',
    where: "Status = 'Existing' AND Genus IS NOT NULL AND Genus <> ''",
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

  fs.writeFileSync(path.join(__dirname, 'mapleridge_bc_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
