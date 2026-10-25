#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';

// This service's layer metadata omits objectIdField, so CityUtil.fetchArcGis's
// default orderByFields=OBJECTID fails with a 400. Page without an order
// clause instead (dataset is static, so offset-based paging is stable).
async function main() {
  let endpoint = 'https://esriweb.villageofbellevuewi.gov/arcgis/rest/services/Public_Access/Public_UrbanForestry/MapServer/1/query';
  let rows: any[] = [];
  let offset = 0;
  let pageSize = 1000;
  for (;;) {
    let response = await axios.get(endpoint, {
      params: {
        where: "Scientific IS NOT NULL AND Scientific <> ''",
        outFields: 'Scientific',
        returnGeometry: true,
        f: 'json',
        outSR: 4326,
        resultOffset: offset,
        resultRecordCount: pageSize
      }
    });
    if (response.data.error) {
      throw new Error(`ArcGIS query failed: ${JSON.stringify(response.data.error)}`);
    }
    let page = response.data.features;
    rows.push(...page);
    console.log(`${rows.length}`);
    if (page.length === 0 || (page.length < pageSize && !response.data.exceededTransferLimit)) {
      break;
    }
    offset += page.length;
  }

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: o.attributes.Scientific.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'bellevue_wi_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
