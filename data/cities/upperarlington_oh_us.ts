#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

async function main() {
  let endpoint = 'https://services5.arcgis.com/ImL8oyfZuCxsvjaT/arcgis/rest/services/Trees_view/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SPP_bot',
    where: "Type = 'Tree' AND MT <> 'GONE' AND SPP_bot IS NOT NULL AND SPP_bot NOT IN ('N/A', 'HEDGE', 'SHRUB', '')",
    returnGeometry: true
  });

  // Values are upper case with cultivars appended, e.g. "ACER X TRUNCATUM PACIFIC SUNSET" or "MALUS SPECIES"
  let trees = rows.map(o => {
    let words = o.attributes.SPP_bot.trim().toLowerCase().split(/\s+/);
    let keep = words[1] === 'x' ? 3 : 2;
    let name = words.slice(0, keep).join(' ').replace(/ (species|spp\.?|sp\.?)$/, '');
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      lat: o.geometry.y,
      lon: o.geometry.x
    };
  });

  fs.writeFileSync(path.join(__dirname, 'upperarlington_oh_us.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
