#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

const endpoint = 'https://services.arcgis.com/f5HgUpxURgEzTccH/arcgis/rest/services/Pinellas_County_Tree_Inventory/FeatureServer/23';
const speciesByCode: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'pinellascounty_fl_us_species.json'), 'utf8')
);

async function main() {
  const codes = Object.keys(speciesByCode).map(code => `'${code.replace(/'/g, "''")}'`).join(',');
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPECIES',
    where: `SPECIES IN (${codes})`,
    returnGeometry: true
  });

  const trees = rows.flatMap(row => {
    const code = String(row.attributes.SPECIES ?? '').trim();
    const name = speciesByCode[code];
    const lat = row.geometry?.y;
    const lon = row.geometry?.x;
    return name && Number.isFinite(lat) && Number.isFinite(lon) ? [{ name, lat, lon }] : [];
  });

  fs.writeFileSync(path.join(__dirname, 'pinellascounty_fl_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
