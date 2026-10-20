#!/usr/bin/env npx tsx

import fs from 'node:fs';
import { DataUtil } from './data_util';

async function main() {

  let endpoint = 'https://services5.arcgis.com/7nsPwEMP38bSkCjy/arcgis/rest/services/Trees_Data_Bureau_of_Street_Services/FeatureServer/0';

  let rows = await DataUtil.fetchArcGis(endpoint, {
      fields: 'TOOLTIP',
      where: "Type_Description IN ('Tree', 'Tree in Tree Well')",
      returnGeometry: true
    }
  );

  let trees = [];
  for (let row of rows) {
    let tooltip = row.attributes.TOOLTIP.replace(/\\n/g, '\n');
    let name = tooltip.match(/(?:^|\n)Botanical Name:\s*([^\r\n]+)/i)?.[1]?.trim();
    let lat = row.geometry.y;
    let lon = row.geometry.x;

    if (name == 'Not Specified' || name == '') {
      continue;
    }

    trees.push({ lat, lon, name });
  }

  fs.writeFileSync('losangeles.json', JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
