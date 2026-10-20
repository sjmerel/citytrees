#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services2.arcgis.com/CnkB6jCzAsyli34z/arcgis/rest/services/OpenData_ParkData/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GenusName,SpeciesName',
    where: "LifeCycleStatus = 'ACT' AND GenusName IS NOT NULL AND GenusName <> ''",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    let genus = a.GenusName.trim(); let sp = (a.SpeciesName ?? '').trim().toLowerCase(); name = sp && !['none', 'unknown', 'spp.', 'sp.'].includes(sp) ? `${genus} ${sp}` : genus;
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'princegeorge_bc_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
