#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Feature {
  geometry: { type: string; coordinates: number[] } | null;
  properties: {
    id: number;
    soortnaam: string | null;
    type_object: string | null;
    type_soortnaam: string | null;
  };
}

// Gemeente Amsterdam, managed public-space trees, including Weesp and some
// neighboring municipalities; not a census of all private trees or forests.
// CC0 1.0, explicitly attached to the Bomen API distribution in this catalog:
// https://data.overheid.nl/dataset/k3ns1vfps3k0hq/rdf
// https://api.data.amsterdam.nl/v1/wfs/bomen/v2
// Excludes Stobbe (stumps), non-tree classes, unknown names and mixed-species
// labels. Pollarded/trained trees remain trees. No public health/removal field.
// geldig_vanaf and mutatie_datum are record dates, not inspection dates.
// API documentation announces future API-key requirements.
async function main() {
  let rows = await CityUtil.fetchWfs<Feature>(
    'https://api.data.amsterdam.nl/v1/wfs/bomen/v2', 'app:stamgegevens');
  let trees = [];
  for (let row of rows) {
    let p = row.properties;
    assert(p.soortnaam === null || typeof p.soortnaam === 'string');
    if (p.type_object === 'Stobbe') continue;
    if (p.type_soortnaam !== null && p.type_soortnaam !== 'Bomen') continue;
    let name = p.soortnaam?.replace(/\s+/g, ' ').trim();
    if (!name || /^(?:Onbekend|Nvt)\b/i.test(name) || / en |Stamhoogte/.test(name)) continue;
    if (/\(heesters?\)/i.test(name)) continue;
    if (/^(?:Abelia|Aucuba|Berberis|Buddleja|Ceanothus|Chaenomeles|Choisya|Chimonanthus|Clethra|Corylopsis|Deutzia|Diervilla|Dipelta|Disanthus|Edgeworthia|Escallonia|Exochorda|Fothergilla|Hamamelis|Hedera|Hydrangea|Itea|Koeleria|Kolkwitzia|Lespedeza|Leucothoe|Leycesteria|Lonicera|Mahonia|Nandina|Parthenocissus|Philadelphus|Physocarpus|Rosa|Sarcococca|Skimmia|Weigela|Wisteria)\b/.test(name)) continue;
    if (/^(?:Aesculus parviflora|Betula pumila|Clerodendrum bungei|Cornus (?:amomum|canadensis|sanguinea)|Cotoneaster cochleatus|Euonymus alatus|Juniperus squamata|Ligustrum vulgare|Podocarpus (?:lawrencei|nivalis)|Prunus (?:cistena|fruticosa|japonica|tenella)|Salix (?:aurita|gracilistyla)|Taxus canadensis|Viburnum (?:bodnantense|davidii|opulus|rhytidophyllum))\b/.test(name)) continue;
    name = name.replace(/\s+cv\.?(?=\s|$)/g, '').trim();
    if (!row.geometry) continue;
    assert.equal(row.geometry.type, 'Point');
    let [lon, lat] = row.geometry.coordinates;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 52.2 && lat < 52.5 && lon > 4.65 && lon < 5.2);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'amsterdam_nl.json'), JSON.stringify(trees, null, 2));
  console.log(`amsterdam_nl: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
