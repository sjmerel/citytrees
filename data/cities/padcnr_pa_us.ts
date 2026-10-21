#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// PA DCNR TreeVitalize statewide compilation. Pittsburgh is excluded because it
// is already covered by its own pittsburgh_pa_us script; the dataset contains
// no Allentown or Philadelphia records to filter.
async function main() {
  let endpoint = 'https://mapservices.pasda.psu.edu/server/rest/services/pasda/DCNR_Treevitalize/MapServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'City,Genus,Species',
    where: "Genus IS NOT NULL AND Genus <> '' AND City <> 'Pittsburgh'",
    returnGeometry: true
  });

  let trees = rows
    .filter(o => o.geometry)
    .map(o => ({
      name: `${o.attributes.Genus.trim()} ${(o.attributes.Species ?? '').trim()}`.trim(),
      lat: o.geometry.y,
      lon: o.geometry.x
    }));

  fs.writeFileSync(path.join(__dirname, 'padcnr_pa_us.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
