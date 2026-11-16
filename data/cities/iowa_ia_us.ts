#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: { SPCODE: string | null; TOWN: string | null; CONDWOOD: number | null; CONDLVS: number | null };
  geometry: { x: number; y: number } | null;
}

// i-Tree Streets Midwest sheet: both codes AND common labels match the DNR domain.
// https://www.itreetools.org/documents/428/Streets%20Species%20Codes.xls
// These are not USDA codes: ACSA1 is silver maple, ACSA2 is sugar maple.
const species: Record<string, string> = {
  AC: 'Acer', ACGI: 'Acer ginnala', ACNE: 'Acer negundo', ACNI: 'Acer nigrum',
  ACPA: 'Acer palmatum', ACPL: 'Acer platanoides', ACRU: 'Acer rubrum',
  ACSA1: 'Acer saccharinum', ACSA2: 'Acer saccharum', AEGL: 'Aesculus glabra',
  AL: 'Alnus', ALJU: 'Albizia julibrissin', BE: 'Betula', BENI: 'Betula nigra',
  BEPA: 'Betula papyrifera', CA1: 'Carya', CA3: 'Catalpa', CADE: 'Castanea dentata',
  CASP: 'Catalpa speciosa', CECA: 'Cercis canadensis', CEOC: 'Celtis occidentalis',
  CLLU: 'Cladrastis kentukea', CO1: 'Cornus', COFL: 'Cornus florida',
  FR: 'Fraxinus', FRAM: 'Fraxinus americana', FRNI: 'Fraxinus nigra',
  FRPE: 'Fraxinus pennsylvanica', GIBI: 'Ginkgo biloba', GLTR: 'Gleditsia triacanthos',
  GYDI: 'Gymnocladus dioicus', ILOP: 'Ilex opaca', ILSP: 'Ilex',
  JU: 'Juniperus', JUNI: 'Juglans nigra', JUVI: 'Juniperus virginiana',
  LIST: 'Liquidambar styraciflua', LITU: 'Liriodendron tulipifera', MA2: 'Malus',
  MAGR: 'Magnolia grandiflora', MAVI: 'Magnolia virginiana', MO: 'Morus',
  MOAL: 'Morus alba', OSVI: 'Ostrya virginiana', PHAM: 'Phellodendron amurense',
  PI1: 'Picea', PIAB: 'Picea abies', PIMA: 'Picea mariana', PINI: 'Pinus nigra',
  PIPU: 'Picea pungens', PIRE: 'Pinus resinosa', PIST: 'Pinus strobus',
  PISY: 'Pinus sylvestris', PIVI: 'Pinus virginiana', PLOC: 'Platanus occidentalis',
  PO: 'Populus', PODE: 'Populus deltoides', PONI: 'Populus nigra',
  POTR1: 'Populus tremuloides', PR: 'Prunus', PRCE: 'Prunus cerasifera',
  PRSE1: 'Prunus serotina', PRSE2: 'Prunus serrulata', PRVI: 'Prunus virginiana',
  PY: 'Pyrus', PYCA: 'Pyrus calleryana', QU: 'Quercus', QUAL: 'Quercus alba',
  QUBI: 'Quercus bicolor', QUCO: 'Quercus coccinea', QUEL: 'Quercus ellipsoidalis',
  QUMA1: 'Quercus macrocarpa', QUPA: 'Quercus palustris', QURU: 'Quercus rubra',
  RHSP: 'Rhus', RHSP2: 'Rhamnus', ROPS: 'Robinia pseudoacacia', SA: 'Salix',
  SADI: 'Salix discolor', SO: 'Sorbus', SYRE: 'Syringa reticulata', SYSP: 'Syringa',
  THOC: 'Thuja occidentalis', TI: 'Tilia', TIAM: 'Tilia americana', TICO: 'Tilia cordata',
  TSCA: 'Tsuga canadensis', ULAM: 'Ulmus americana', ULPA: 'Ulmus parvifolia',
  ULPU: 'Ulmus pumila', ULS: 'Ulmus'
};

// Prefer the separate municipal inventories where they already exist.
const coveredTowns = new Set(['davenport', 'des moines', 'dubuque']);

export function treeSite(row: Tree) {
  let p = row.attributes;
  if (coveredTowns.has(p.TOWN?.trim().toLowerCase() ?? '')) return;
  if (p.CONDWOOD === 1 || p.CONDLVS === 1) return; // DNR: dead or dying.
  let code = p.SPCODE?.trim();
  if (!code || /^(?:UNKNOWN|AVPS[SLM]|(?:BD[SLM]|BE[SLM]|CE[SLM]) OTHER|HISY)$/.test(code)) return;
  assert(Object.hasOwn(species, code), `Unknown Iowa species code: ${code}`);
  let name = species[code];
  assert(row.geometry);
  let { x: lon, y: lat } = row.geometry;
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 40.3 && lat < 43.6 && lon > -96.7 && lon < -90);
  return { lat, lon, name };
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://services2.arcgis.com/r6iFVcMJeA4kB4GC/arcgis/rest/services/Iowa_DNR_Urban_Tree_Inventory_Public/FeatureServer/0',
    { fields: 'OBJECTID,TOWN,SPCODE,CONDWOOD,CONDLVS', returnGeometry: true, verifyComplete: true });
  let trees = rows.flatMap(row => {
    let tree = treeSite(row);
    return tree ? [tree] : [];
  });
  assert(trees.length > 250000, 'Unexpectedly few Iowa trees');
  fs.writeFileSync(path.join(__dirname, 'iowa_ia_us.json'), JSON.stringify(trees));
  console.log(`iowa_ia_us: ${trees.length} trees; ${rows.length - trees.length} records omitted`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
