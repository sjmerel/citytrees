#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  // Santa Clara County service; layer 2 is Palo Alto.
  let endpoint = 'https://services.arcgis.com/NkcnS0qk4w2wasOJ/arcgis/rest/services/Tree_Inventories_in_Santa_Clara_County_WFL1/FeatureServer/2';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'SPP',
    where: "SPP LIKE '_% %' AND SPP NOT LIKE 'Vacant%' AND SPP NOT IN ('OBSOLETE SITE', 'ZSpecies1')",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.SPP.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'paloalto.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
