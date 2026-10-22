#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Moorhead's public TreePlotter mirror, Trees layer (not work orders or requests).
// https://www.arcgis.com/home/item.html?id=efd9f39819d54020b610ef0f5f0c0c04
// Verified 2026-10-21; mirror last edited August 2024, not a guaranteed live inventory.
// No scientific epithets are supplied; retain genus only, never infer species from common names.
async function main() {
  const endpoint = 'https://services.arcgis.com/t2tplTEKxuL7eSvF/arcgis/rest/services/Treeplotter_Inventory/FeatureServer/2';
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'species_genus,status,archived',
    where: "status = 'Alive'",
    returnGeometry: true
  });
  const corrections: Record<string, string> = {
    Quarcus: 'Quercus',
    Aesculas: 'Aesculus',
    Vibernum: 'Viburnum',
    Magnolie: 'Magnolia',
    Spirea: 'Spiraea'
  };
  const excluded = new Set(['N/A', 'Conifer', 'Betulaceae', 'Berberidinae']);
  const trees = rows.flatMap(row => {
    const attributes = row.attributes;
    const genus = String(attributes.species_genus ?? '').trim();
    const name = corrections[genus] ?? genus;
    const lat = row.geometry?.y;
    const lon = row.geometry?.x;
    if (attributes.status !== 'Alive' || String(attributes.archived).toLowerCase() === 'true' ||
        excluded.has(genus) || !/^[A-Z][a-z]+$/.test(name) ||
        !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'moorhead_mn_us.json'), JSON.stringify(trees, null, 2));
  console.log(`wrote ${trees.length} genus-only trees`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
