#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services9.arcgis.com/UGpGSV1ugL0pHSgX/arcgis/rest/services/Trees_PlanITGeo/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Scientific,Latitude,Longitude',
    where: "Scientific IS NOT NULL AND Scientific <> ''"
  });

  let trees = rows.flatMap(o => {
    let lat = o.attributes.Latitude;
    let lon = o.attributes.Longitude;
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? [{ name: o.attributes.Scientific.trim(), lat, lon }]
      : [];
  });

  fs.writeFileSync(path.join(__dirname, 'brisbaneca_ca_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
