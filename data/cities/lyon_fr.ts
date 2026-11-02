#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: [number, number] } | null;
  properties: { gid: number; genre: string | null; espece: string | null };
}

// Métropole de Lyon, "Arbres d'alignement de la Métropole de Lyon" (street trees only).
async function main() {
  let rows = await CityUtil.fetchWfs<Feature>('https://data.grandlyon.com/geoserver/ows',
    'metropole-de-lyon:abr_arbres_alignement.abrarbre', 'gid');

  let trees = [];
  for (let row of rows) {
    let genus = row.properties.genre?.trim() ?? '';
    if (genus === '' || ['Emplacement libre', 'Souche', 'Non défini'].includes(genus) || row.geometry === null) {
      continue;
    }
    assert.equal(row.geometry.type, 'Point');
    // e.g. "hybride turneri"
    let species = (row.properties.espece?.trim() ?? '').replace(/^hybride /, 'x ');
    trees.push({
      name: species === '' ? genus : `${genus} ${species}`,
      lat: row.geometry.coordinates[1],
      lon: row.geometry.coordinates[0]
    });
  }

  fs.writeFileSync(path.join(__dirname, 'lyon_fr.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
