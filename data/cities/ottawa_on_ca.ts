#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://maps.ottawa.ca/arcgis/rest/services/Forestry/MapServer/0';

  // SPECIES holds a coded common name; the domain maps each code to the scientific name.
  let layer = (await axios.get(endpoint, { params: { f: 'json' } })).data;
  let domain = layer.fields.find((f: any) => f.name === 'SPECIES').domain.codedValues;
  let scientific = new Map<string, string>(domain.map((v: any) => [v.code, v.name]));

  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: "SPECIES IS NOT NULL AND STATUS = 'Active'",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let name = scientific.get(o.attributes.SPECIES)?.replace(/\s+(species|spp?\.)$/i, '').trim();
    if (!name || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'ottawa_on_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
