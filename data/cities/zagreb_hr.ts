#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// Source "vrsta" values are ALL CAPS "GENUS EPITHET [CULTIVAR/VARIETY...]" (e.g. "PRUNUS
// CERASIFERA NIGRA" or "PLATANUS x ACERIFOLIA"); keep only genus + epithet (handling the
// hybrid marker "x") and drop any trailing cultivar/variety words.
function toBotanicalName(raw: string): string | undefined {
  let tokens = raw.trim().split(/\s+/);
  if (tokens.length < 2) return undefined;
  let genus = tokens[0][0].toUpperCase() + tokens[0].slice(1).toLowerCase();
  if (tokens[1].toLowerCase() === 'x' && tokens.length >= 3) {
    return `${genus} x ${tokens[2].toLowerCase()}`;
  }
  return `${genus} ${tokens[1].toLowerCase()}`;
}

async function main() {
  let endpoint = 'https://services-eu1.arcgis.com/6BlpNMAIwm2EjKih/arcgis/rest/services/ZG3D_stabla_2025_Z/FeatureServer/0';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'vrsta',
    where: "vrsta IS NOT NULL",
    returnGeometry: true
  });

  let trees = rows.flatMap(o => {
    let name = toBotanicalName(o.attributes.vrsta);
    return name ? [{ name, lat: o.geometry.y, lon: o.geometry.x }] : [];
  });

  fs.writeFileSync(path.join(__dirname, 'zagreb_hr.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
