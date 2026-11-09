#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Attributes {
  Common_Nam: string | null;
  Genus: string | null;
  Species: string | null;
  condition: number;
}

interface Feature {
  attributes: Attributes & { OBJECTID: number };
  geometry: { x: number; y: number } | null;
}

// Partial named parks collection, not the unnamed 2016 street-tree locations.
// The project owner confirms permission to use and redistribute this inventory.
// https://www.arcgis.com/home/item.html?id=e187360380194febb1aaa875bcd68e0c
const genera: Record<string, string> = {
  Querus: 'Quercus',
  Quecus: 'Quercus',
  Liquidamber: 'Liquidambar',
  Sciadopytis: 'Sciadopitys',
  Sciadopytys: 'Sciadopitys',
  Amelanchiar: 'Amelanchier',
  Syphnolobium: 'Styphnolobium',
  Gleditzia: 'Gleditsia',
  // These abbreviations also occur spelled out with the same common labels.
  Pl: 'Platanus',
  Gled: 'Gleditsia'
};

export function botanicalName(p: Attributes): string | undefined {
  assert(p.Genus === null || typeof p.Genus === 'string');
  assert(p.Species === null || typeof p.Species === 'string');
  assert(p.Common_Nam === null || typeof p.Common_Nam === 'string');
  let genus = p.Genus?.trim();
  if (!genus) return;
  if (genus === 'Fagus sylvatica') return genus;
  genus = Object.hasOwn(genera, genus) ? genera[genus] : genus;
  assert(/^[A-Z][a-z]+$/.test(genus), `Unexpected Greenwich genus: ${genus}`);
  // One source record calls a botanical sweetgum "Tuliptree"; neither wins.
  if (genus === 'Liquidambar' && p.Common_Nam?.trim().toLowerCase() === 'tuliptree') return;
  let species = p.Species?.trim() ?? '';
  if (genus === 'Sciadopitys' && species === 'verticilata') species = 'verticillata';
  // Do not infer species from Variety, cultivar names, abbreviations or '?'.
  if (!species || /^(?:spp?\.?|tri)$/.test(species) || !/^(?:x )?[a-z][a-z-]+$/.test(species)) {
    return genus;
  }
  return `${genus} ${species}`;
}

async function main() {
  let rows: Feature[] = await CityUtil.fetchArcGis(
    'https://services2.arcgis.com/cYiUUgMhu4YB7W9G/arcgis/rest/services/Parks_Trees_GIS_gdb/FeatureServer/1',
    { fields: 'OBJECTID,Common_Nam,Genus,Species,condition',
      where: "Genus IS NOT NULL AND Genus <> '' AND Genus <> ' '",
      returnGeometry: true, verifyComplete: true });
  let trees: { lat: number; lon: number; name: string }[] = [];
  let ids = new Set<number>();
  let omitted = 0;
  for (let row of rows) {
    assert(Number.isInteger(row.attributes.OBJECTID) && !ids.has(row.attributes.OBJECTID));
    ids.add(row.attributes.OBJECTID);
    // All current condition codes are unset; review any future populated codes.
    assert.equal(row.attributes.condition, 0, 'Review Greenwich condition code before importing');
    let name = botanicalName(row.attributes);
    if (!name || !row.geometry) {
      ++omitted;
      continue;
    }
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 40.98 && lat < 41.16 && lon > -73.74 && lon < -73.55);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'greenwich_ct_us.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({ city: 'greenwich_ct_us', source_count: rows.length, final_count: trees.length, omitted }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
