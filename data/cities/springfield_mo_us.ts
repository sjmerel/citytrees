#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { DataUtil } from '../data_util';

async function main() {
  const endpoint = 'https://services1.arcgis.com/aOss8CrQf3pARS5q/arcgis/rest/services/Tree_Inventory/FeatureServer/34';
  const metadata = (await axios.get(endpoint, { params: { f: 'json' } })).data;
  const speciesField = metadata.fields?.find((field: any) => field.name === 'SCI_NAME');
  const codedValues = speciesField?.domain?.codedValues;
  if (!Array.isArray(codedValues)) throw new Error('Springfield SCI_NAME code lookup is unavailable');

  const names = new Map(codedValues.map((item: any) => [String(item.code), String(item.name).trim()]));
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SCI_NAME',
    where: "SCI_NAME IS NOT NULL AND SCI_NAME NOT IN ('OVERSTORY', 'UNDERSTORY', 'UNKNTREE')",
    returnGeometry: true
  });

  const trees = rows.flatMap((row: any) => {
    const rawName = names.get(String(row.attributes.SCI_NAME));
    if (!rawName || /^(overstory|understory|unknown)$/i.test(rawName)) return [];
    const name = rawName.replace(/\s+spp?\.?$/i, '').trim();
    if (!name || !row.geometry) return [];
    return [{ name, lat: row.geometry.y, lon: row.geometry.x }];
  });

  fs.writeFileSync(path.join(__dirname, 'springfield_mo_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees to springfield_mo_us.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
