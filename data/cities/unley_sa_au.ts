#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

function titleCase(s: string) {
  return s.trim().replace(/^./, c => c.toUpperCase());
}

async function main() {
  let endpoint = 'https://services9.arcgis.com/vsQXCXZ0LMZJANxk/arcgis/rest/services/Trees/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "GENUS IS NOT NULL AND SPECIES IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: `${titleCase(o.attributes.GENUS)} ${o.attributes.SPECIES.trim().toLowerCase()}`,
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'unley_sa_au.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
