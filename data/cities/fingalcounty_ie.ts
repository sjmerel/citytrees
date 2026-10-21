#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/CI1e5PKQXvJgmJK8/arcgis/rest/services/Trees_FCC/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species_Desc,Lat,Long',
    where: "Species_Desc IS NOT NULL"
  });

  let trees = rows.flatMap(o => {
    let lat = o.attributes.Lat;
    let lon = o.attributes.Long;
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? [{ name: o.attributes.Species_Desc.trim(), lat, lon }]
      : [];
  });

  fs.writeFileSync(path.join(__dirname, 'fingalcounty_ie.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
