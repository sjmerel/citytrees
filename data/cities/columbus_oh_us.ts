#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { x: number; y: number } | null;
  attributes: {
    SP_CODE: string;
  };
}

// City of Columbus, Public Owned Trees; CC0 in the authoritative catalog item:
// https://www.arcgis.com/home/item.html?id=674e4a358e8042f69a734f229a93823c
// The live municipal service includes parks, street trees, vacant sites and
// retired assets. Exclude retired/dead trees, planting/removal/stump work and
// unknown/vacant codes. Inspection dates vary; the street census ended in 2023.
// Codes are NOT interchangeable with USDA symbols. Crosswalk common labels
// against the City's Tree Technical Manual, May 2026, Appendix B, pages 53-62:
// https://columbusrecparks.com/wp-content/uploads/2026/05/Columbus-Tree-Technical-Manual-May-2026-.pdf
// GBIF vernacular-name records corroborate common/trade-name variants.
// Use genus only where this source verifies the group but not the species;
// omit groups without a verified crosswalk, including most conifers.
const species: Record<string, [string, string]> = {
  AIAL: ['Ailanthus (Tree of Heaven)', 'Ailanthus altissima'],
  ACBU: ['Maple, Trident', 'Acer buergerianum'],
  ACFR: ['Maple, Freeman', 'Acer x freemanii'],
  ACGI: ['Maple, Amur', 'Acer ginnala'],
  ACGR14: ['Maple, Paperbark', 'Acer griseum'],
  ACMI: ['Maple, Miyabe', 'Acer miyabei'],
  ACNE: ['Maple, Boxelder', 'Acer negundo'],
  ACNI: ['Maple, Black', 'Acer nigrum'],
  ACPL: ['Maple, Norway', 'Acer platanoides'],
  ACRU: ['Maple, Red', 'Acer rubrum'],
  ACSA1: ['Maple, Silver', 'Acer saccharinum'],
  ACSA2: ['Maple, Sugar', 'Acer saccharum'],
  ACTA: ['Maple, Tatarian', 'Acer tataricum'],
  AECA: ['Horsechestnut, Red', 'Aesculus x carnea'],
  AEPA: ['Buckeye, Red', 'Aesculus pavia'],
  AMAR: ['Serviceberry, Downy', 'Amelanchier arborea'],
  ASTR: ['Pawpaw', 'Asimina triloba'],
  BELE: ['Birch, Black', 'Betula lenta'],
  BENI: ['Birch, River', 'Betula nigra'],
  BEPO: ['Birch, Grey', 'Betula populifolia'],
  CABE: ['Hornbeam, European', 'Carpinus betulus'],
  CACA: ['Hornbeam, American', 'Carpinus caroliniana'],
  CAIL: ['Pecan', 'Carya illinoinensis'],
  CASP: ['Catalpa, Northern', 'Catalpa speciosa'],
  CECA: ['Redbud, Eastern', 'Cercis canadensis'],
  CEJA: ['Katsuratree', 'Cercidiphyllum japonicum'],
  CEOC: ['Hackberry, Common', 'Celtis occidentalis'],
  CHVI: ['Fringetree', 'Chionanthus virginicus'],
  CLKE: ['Yellowwood', 'Cladrastis kentukea'],
  CO1KO: ['Dogwood, Kousa', 'Cornus kousa'],
  CO1MA: ['Dogwood, Cornelian Cherry', 'Cornus mas'],
  CO2CO: ['Filbert, Turkish', 'Corylus colurna'],
  DIVI: ['Persimmon', 'Diospyros virginiana'],
  EUUL: ['Rubber Tree, Hardy', 'Eucommia ulmoides'],
  FAGR: ['Beech, American', 'Fagus grandifolia'],
  FASY: ['Beech, European', 'Fagus sylvatica'],
  GIBI: ['Ginkgo', 'Ginkgo biloba'],
  GLTR: ['Honeylocust', 'Gleditsia triacanthos'],
  GYDI: ['Coffeetree, Kentucky', 'Gymnocladus dioicus'],
  HACA: ['Silverbell', 'Halesia carolina'],
  HEPMI: ['Seven-son Flower', 'Heptacodium miconioides'],
  JUNI: ['Walnut, Black', 'Juglans nigra'],
  KOPA: ['Raintree, Golden', 'Koelreuteria paniculata'],
  LIST: ['Sweetgum, American', 'Liquidambar styraciflua'],
  LITU: ['Tuliptree', 'Liriodendron tulipifera'],
  MA3SO: ['Magnolia, Saucer', 'Magnolia x soulangiana'],
  MA3VI: ['Magnolia, Sweetbay', 'Magnolia virginiana'],
  MAAM: ['Maackia, Amur', 'Maackia amurensis'],
  MAPO: ['Osage Orange', 'Maclura pomifera'],
  MEGL: ['Redwood, Dawn', 'Metasequoia glyptostroboides'],
  MOAL: ['Mulberry, White', 'Morus alba'],
  MORU2: ['Mulberry, Red', 'Morus rubra'],
  NYSY: ['Black Gum (Tupelo)', 'Nyssa sylvatica'],
  OSVI: ['Hophornbeam, American', 'Ostrya virginiana'],
  PAPE: ['Ironwood, Persian', 'Parrotia persica'],
  PLAC: ['Planetree, London', 'Platanus x acerifolia'],
  PRCE: ['Plum, Purple Leaf', 'Prunus cerasifera'],
  PRPE2: ['Peach', 'Prunus persica'],
  PRSA: ['Cherry, Sargent', 'Prunus sargentii'],
  PRSE3: ['Cherry, Japanese Flowering', 'Prunus serrulata'],
  PYCA: ['Pear, Callery', 'Pyrus calleryana'],
  PYCO: ['Pear, Common', 'Pyrus communis'],
  QUAC: ['Oak, Sawtooth', 'Quercus acutissima'],
  QUAL: ['Oak, White', 'Quercus alba'],
  QUBI: ['Oak, Swamp White', 'Quercus bicolor'],
  QUIM: ['Oak, Shingle', 'Quercus imbricaria'],
  QULY: ['Oak, Overcup', 'Quercus lyrata'],
  QUMA1: ['Oak, Bur', 'Quercus macrocarpa'],
  QUPH: ['Oak, Willow', 'Quercus phellos'],
  QUPR: ['Oak, Chestnut', 'Quercus montana'],
  QURO: ['Oak, English', 'Quercus robur'],
  QURU: ['Oak, Red', 'Quercus rubra'],
  QUSH: ['Oak, Shumard', 'Quercus shumardii'],
  SAAL: ['Sassafras', 'Sassafras albidum'],
  STJA: ['Snowbell, Japanese', 'Styrax japonicus'],
  SYPE: ['Lilac, Peking Tree', 'Syringa pekinensis'],
  SYRE: ['Lilac, Japanese Tree', 'Syringa reticulata'],
  TADI: ['Baldcypress', 'Taxodium distichum'],
  TIAM: ['Basswood, American', 'Tilia americana'],
  TICO: ['Linden, Littleleaf', 'Tilia cordata'],
  TITO: ['Linden, Silver', 'Tilia tomentosa'],
  ULAM: ['Elm, American', 'Ulmus americana'],
  ZESE: ['Zelkova', 'Zelkova serrata']
};

const genera: Record<string, string> = {
  Apple: 'Malus',
  Ash: 'Fraxinus',
  Basswood: 'Tilia',
  'Basswood (Linden)': 'Tilia',
  Beech: 'Fagus',
  Birch: 'Betula',
  Buckeye: 'Aesculus',
  Catalpa: 'Catalpa',
  Cherry: 'Prunus',
  Crabapple: 'Malus',
  Dogwood: 'Cornus',
  Elm: 'Ulmus',
  Filbert: 'Corylus',
  Fringetree: 'Chionanthus',
  Hackberry: 'Celtis',
  Hawthorn: 'Crataegus',
  Hornbeam: 'Carpinus',
  Horsechestnut: 'Aesculus',
  Linden: 'Tilia',
  Magnolia: 'Magnolia',
  Maple: 'Acer',
  Mulberry: 'Morus',
  Oak: 'Quercus',
  Pear: 'Pyrus',
  Plum: 'Prunus',
  Poplar: 'Populus',
  Cottonwood: 'Populus',
  Serviceberry: 'Amelanchier',
  Snowbell: 'Styrax',
  Walnut: 'Juglans',
  Willow: 'Salix'
};

async function main() {
  let endpoint = 'https://maps2.columbus.gov/arcgis/rest/services/Schemas/RecreationParks/MapServer/1';
  let response = await CityUtil.getWithRetry(endpoint, { params: { f: 'json' }, timeout: 120000 });
  let fields: { name: string; domain?: { codedValues: { code: string; name: string }[] } | null }[] = response.data.fields;
  assert(Array.isArray(fields), 'Columbus metadata did not contain fields');
  let domain = fields.find(field => field.name === 'SP_CODE')?.domain?.codedValues;
  assert(Array.isArray(domain), 'Columbus species domain is missing');
  let labels = new Map<string, string>();
  for (let entry of domain) {
    assert(typeof entry.code === 'string' && typeof entry.name === 'string' && !labels.has(entry.code));
    labels.set(entry.code, entry.name);
  }
  for (let [code, [label]] of Object.entries(species)) {
    assert.equal(labels.get(code), label, `Columbus species code changed: ${code}`);
  }
  let rows: Feature[] = await CityUtil.fetchArcGis(endpoint, {
    where: "RETIRED IS NULL AND (CONDITION1 IS NULL OR CONDITION1 <> 0) AND (MAINTENANCE IS NULL OR MAINTENANCE NOT IN ('2','4','5')) AND SP_CODE NOT IN ('STUMP','2TE','2TB','2TREE','VSL','VSM','VSS')",
    fields: 'OBJECTID,SP_CODE', returnGeometry: true, verifyComplete: true
  });
  let unmapped = new Set<string>();
  let trees = [];
  for (let row of rows) {
    let code = row.attributes.SP_CODE;
    assert(typeof code === 'string');
    let label = labels.get(code);
    if (!label || label === 'Dogwood, Gray' || label === 'Buckeye, Bottlebrush') {
      unmapped.add(code);
      continue;
    }
    let group = label.split(',')[0].replace(/ spp\.$/, '');
    let name = species[code]?.[1] ?? genera[group];
    if (!name) {
      unmapped.add(code);
      continue;
    }
    if (!row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 39.75 && lat < 40.3 && lon > -83.25 && lon < -82.7);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'columbus_oh_us.json'), JSON.stringify(trees, null, 2));
  console.log(`columbus_oh_us: ${trees.length} trees; ${rows.length - trees.length} active records omitted`);
  console.log(`Excluded or unmapped species codes: ${[...unmapped].sort().join(', ')}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
