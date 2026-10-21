#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://utility.arcgis.com/usrsvcs/servers/a6a5b1e8237f466a8812424d719af26c/rest/services/ParkFeatures/FeatureServer/14';
  // the "Retired" field triggers a server-side error when paginated, so it is not requested;
  // a handful of removed/retired trees may remain in the output as a result
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'Species',
    where: "Species IS NOT NULL AND Species <> ''",
    returnGeometry: true
  });

  let trees = rows.map(o => ({
    name: o.attributes.Species.trim(),
    lat: o.geometry.y,
    lon: o.geometry.x
  }));

  fs.writeFileSync(path.join(__dirname, 'stgeorge_ut_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
