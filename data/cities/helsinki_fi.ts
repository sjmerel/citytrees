#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    id: number;
    suku: string | null;
    laji: string | null;
  };
}

// City of Helsinki tree register, public streets and partial park coverage;
// excludes forests/private plots. Some arboretum shrubs are also in the source.
// CC BY 4.0: attribute City of Helsinki and indicate filtering/name processing.
// https://hri.fi/data/en_GB/dataset/helsingin-kaupungin-puurekisteri
// Official geographic-data license policy:
// https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/make-better-use-of-geospatial-data/open-geographic-data
// No public health/removal field. paivitetty_tietopalveluun is a service update
// date, not an inspection date; istutusvuosi is the planting year.
// Offline bulk import; the city requests contact for live online integrations.
async function main() {
  let rows = await CityUtil.fetchWfs<Feature>(
    'https://kartta.hel.fi/ws/geoserver/avoindata/wfs', 'avoindata:Puurekisteri_piste');
  let trees = [];
  for (let row of rows) {
    let p = row.properties;
    assert(p.suku === null || typeof p.suku === 'string');
    assert(p.laji === null || typeof p.laji === 'string');
    let genus = p.suku?.trim();
    if (!genus || !/^[A-Z][a-z]+$/.test(genus)) continue;
    if (/^(?:Abelia|Abeliophyllum|Actinidia|Amorpha|Calycanthus|Colutea|Comptonia|Corylopsis|Dirca|Disanthus|Eleutherococcus|Enkianthus|Hamamelis|Hydrangea|Kalmia|Kerria|Ligustrum|Lonicera|Philadelphus|Pieris|Rhododendron|Ribes|Shepherdia|Stephanandra|Tripterygium|Vaccinium|Weigela)$/.test(genus)) continue;
    let name = [genus, p.laji?.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ');
    if (/^(?:Aesculus parviflora|Alnus crispa|Amelanchier spicata|Cornus sanguinea|Ilex verticillata|Juniperus sabina|Pinus pumila|Taxus canadensis|Viburnum (?:alnifolia|carlesii|furcatum|opulus|rafinesquianum))$/.test(name)) continue;
    if (!row.geometry) continue;
    assert.equal(row.geometry.type, 'Point');
    let [lon, lat] = row.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 60.1 && lat < 60.35 && lon > 24.75 && lon < 25.25);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'helsinki_fi.json'), JSON.stringify(trees, null, 2));
  console.log(`helsinki_fi: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
