#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// SPECIES is free text: sometimes "Genus species (Common name)", often just a common-name fragment
// ("Norway", "Green ash"), so fall back to GENUS unless SPECIES is clearly a botanical name.
function botanicalName(genus: string, species: string): string {
  genus = genus.trim();
  species = species.trim();
  let hasCommon = /\(.*\)\s*$/.test(species);
  let latin = species.replace(/\s*\(.*\)\s*$/, '').replace(/\s*[‘’'“”"].*$/, '').trim();
  let m = latin.match(/^([A-Z][a-z]+) (?:([x×]) )?([a-z]+)\b/);
  if (m && (hasCommon || m[1].toLowerCase() === genus.toLowerCase())) {
    return m[2] ? `${m[1]} × ${m[3]}` : `${m[1]} ${m[3]}`;
  }
  if (!/^[A-Za-z]+$/.test(genus) || /^(other|unknown)$/i.test(genus)) {
    return '';
  }
  return genus.replace(/^x(?=[A-Z])/, '× ');
}

async function main() {
  let endpoint = 'https://services1.arcgis.com/ZMQyarkhNAnn8lip/ArcGIS/rest/services/Parks_PRD/FeatureServer/1355';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'GENUS,SPECIES',
    where: "Status = 'ACT' AND TYPE <> 'Stump'",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let name = botanicalName(o.attributes.GENUS ?? '', o.attributes.SPECIES ?? '');
    if (!name || !o.geometry) continue;
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'penticton_bc_ca.json'), JSON.stringify(trees, null, 2));
}

////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
