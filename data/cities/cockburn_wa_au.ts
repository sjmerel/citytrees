#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let rows = await CityUtil.fetchArcGis(
    'https://services-ap1.arcgis.com/pvAgeoXPDsVDgOQ0/arcgis/rest/services/Street_Trees_3857_1de94/FeatureServer/0',
    { where: 'Botanical_Name IS NOT NULL', fields: 'Botanical_Name', returnGeometry: true });
  let trees = [];

  for (let row of rows) {
    // "Eucalyptus species" / "Eucalyptus sp." are genus-only; a bare "Palm" is not botanical
    let name = (row.attributes.Botanical_Name ?? '').trim().replace(/\s+/g, ' ').replace(/ (species|spp?\.?)$/i, '');
    let lat = row.geometry?.y;
    let lon = row.geometry?.x;
    if (!name || !name.includes(' ') && /^palm$/i.test(name) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'cockburn_wa_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
