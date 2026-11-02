#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

// Some records have a species code instead of a botanical name; mostly genus(2)+species(2), some USDA PLANTS symbols.
// Ambiguous codes (e.g. ACGR, AM, MAPR, UNO) are omitted and those records skipped.
const speciesCodes: Record<string, string> = {
  AC: 'Acer', ACCA: 'Acer campestre', ACFR: 'Acer × freemanii', ACPA: 'Acer palmatum', ACPL: 'Acer platanoides',
  ACPLCR: 'Acer platanoides', ACPS: 'Acer pseudoplatanus', ACRU: 'Acer rubrum', ACRUMO: 'Acer rubrum',
  ACSA2: 'Acer saccharinum', ACSPI: 'Acer spicatum', AEGL: 'Aesculus glabra', BENI: 'Betula nigra',
  CABE: 'Carpinus betulus', CASP: 'Catalpa speciosa', CECA: 'Cercis canadensis', CEJA: 'Cercidiphyllum japonicum',
  CEOC: 'Celtis occidentalis', CRVI: 'Crataegus viridis', FASY: 'Fagus sylvatica', FR: 'Fraxinus',
  FRAM: 'Fraxinus americana', FRPE: 'Fraxinus pennsylvanica', FRQU: 'Fraxinus quadrangulata', GIBI: 'Ginkgo biloba',
  GIBIM: 'Ginkgo biloba', GLTR: 'Gleditsia triacanthos', GYDI: 'Gymnocladus dioicus', JUNI: 'Juglans nigra',
  LIST: 'Liquidambar styraciflua', LITU: 'Liriodendron tulipifera', MOAL_P: 'Morus alba', OSVI: 'Ostrya virginiana',
  PHYOP: 'Physocarpus opulifolius', PIGL1: 'Picea glauca', PIRU: 'Picea rubens', PIST: 'Pinus strobus',
  PLAC: 'Platanus × acerifolia', PLOC: 'Platanus occidentalis', PONIIT: 'Populus nigra', PRSE2: 'Prunus serotina',
  PYCA: 'Pyrus calleryana', PYCO: 'Pyrus communis', QU: 'Quercus', QUAL: 'Quercus alba', QUBI: 'Quercus bicolor',
  QUEBI: 'Quercus bicolor', QUCOC: 'Quercus coccinea', QUMA1: 'Quercus macrocarpa', QUMU: 'Quercus muehlenbergii',
  QUPA: 'Quercus palustris', QURO: 'Quercus robur', QURU: 'Quercus rubra', ROPS: 'Robinia pseudoacacia',
  ROPSE: 'Robinia pseudoacacia', SYRE: 'Syringa reticulata', TI: 'Tilia', TIAM: 'Tilia americana', TICO: 'Tilia cordata',
  TIEU2: 'Tilia × europaea', TIPL: 'Tilia platyphyllos', TITO: 'Tilia tomentosa', ULAC: 'Ulmus', ULAM: 'Ulmus americana',
  ULAM_P: 'Ulmus americana', ULS: 'Ulmus', VIRHY: 'Viburnum rhytidophyllum'
};

async function main() {
  let endpoint = 'https://services2.arcgis.com/11XBiaBYA9Ep0yNJ/arcgis/rest/services/Public_Trees/FeatureServer/0';
  let rows = await CityUtil.fetchArcGis(endpoint, {
    fields: 'SP_SCIEN',
    where: "SP_SCIEN IS NOT NULL AND ASSETSTAT = 'INS'",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let a = o.attributes;
    let name: string;
    let code = a.SP_SCIEN.trim();
    if (/^[A-Z0-9_]+$/.test(code)) {
      if (!speciesCodes[code] || !o.geometry) continue;
      trees.push({ name: speciesCodes[code], lat: o.geometry.y, lon: o.geometry.x });
      continue;
    }
    name = a.SP_SCIEN.replace(/\s*\(genus\)/i, '').trim();
    name = name.replace(/\s*[(‘’'"Γ,\n].*$/s, '').replace(/\s+[x×]$/, '').trim();
    name = name.toLowerCase().replace(/^./, c => c.toUpperCase());
    if (!/^[A-Z][a-z]+( |$)/.test(name) || /^unknown/i.test(name) || !o.geometry || !Number.isFinite(o.geometry.y) || !Number.isFinite(o.geometry.x)) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'halifax_ns_ca.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
