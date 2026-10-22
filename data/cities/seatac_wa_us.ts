#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of SeaTac's managed-tree inventory, verified 2026-10-21.
// https://www.arcgis.com/home/item.html?id=0fde99c1b49f4248a8f60caf3e117ea3
// Records were republished April 2026; this does not establish their survey date.
// SpeciesType abbreviates the genus ("P. Calleryana"); "NA" retains genus-only coverage.
async function main() {
  const endpoint = 'https://services3.arcgis.com/DLryYCwhA8W7Jq7Q/arcgis/rest/services/Trees/FeatureServer/0';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'GenusType,SpeciesType,Status,Dead',
    where: "Status = 'Alive'",
    returnGeometry: true
  });
  const trees = rows.flatMap(row => {
    const attributes = row.attributes;
    const genus = String(attributes.GenusType ?? '').trim();
    const species = String(attributes.SpeciesType ?? '').replace(/\s+/g, ' ').trim();
    const epithet = species.replace(/^[A-Z]\.\s*/i, '').toLowerCase();
    const lat = row.geometry?.y;
    const lon = row.geometry?.x;
    if (attributes.Status !== 'Alive' || attributes.Dead === 'Yes' ||
        !/^[A-Z][a-z]+$/.test(genus) || ['Unknown', 'Cupressaceae'].includes(genus) ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }
    const name = !epithet || ['na', 'unknown'].includes(epithet) ? genus : `${genus} ${epithet}`;
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'seatac_wa_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
