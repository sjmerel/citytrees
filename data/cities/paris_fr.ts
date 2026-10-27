#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  idbase: number;
  typeemplacement: string;
  genre: string | null;
  espece: string | null;
  varieteoucultivar: string | null;
  geo_point_2d: { lat: number; lon: number } | null;
}

// Ville de Paris / Direction des Espaces Verts et de l'Environnement, Arbres:
// https://opendata.paris.fr/explore/dataset/les-arbres/
// ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
// Distribution requires attribution/license notices and ODbL compliance for
// derived databases, including machine-readable data/complete alterations.
// Municipal streets, parks and facilities, including suburban cemeteries;
// not private trees/forest stands. Updates can lag, especially in parks.
// No individual inspection date or health/removal field is published.
// Source repeats some idbase values: collapse identical botanical/location
// records, but omit all records for an ID with conflicting identifications.
async function main() {
  let endpoint = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/les-arbres';
  async function getCount() {
    let response = await CityUtil.getWithRetry(`${endpoint}/records`, {
      params: { limit: 0 }, timeout: 120000
    });
    let count: number = response.data.total_count;
    assert(Number.isSafeInteger(count) && count > 0);
    return count;
  }
  let total = await getCount();
  let response = await CityUtil.getWithRetry(`${endpoint}/exports/json`, { timeout: 180000 });
  let rows: Tree[] = response.data;
  assert(Array.isArray(rows));
  assert.equal(rows.length, total, 'Incomplete Paris export');
  assert.equal(await getCount(), total, 'Paris inventory changed during download; retry');
  let sites = new Map<number, Tree | null>();
  for (let row of rows) {
    assert(Number.isSafeInteger(row.idbase));
    let previous = sites.get(row.idbase);
    if (previous === null) continue;
    if (previous !== undefined) {
      let identity = (r: Tree) => JSON.stringify([
        r.genre, r.espece, r.varieteoucultivar, r.geo_point_2d?.lat, r.geo_point_2d?.lon
      ]);
      if (identity(previous) !== identity(row)) sites.set(row.idbase, null);
    } else {
      sites.set(row.idbase, row);
    }
  }
  let trees = [];
  for (let row of sites.values()) {
    if (!row || row.typeemplacement !== 'Arbre') continue;
    assert(row.genre === null || typeof row.genre === 'string');
    assert(row.espece === null || typeof row.espece === 'string');
    assert(row.varieteoucultivar === null || typeof row.varieteoucultivar === 'string');
    let genus = row.genre?.trim();
    if (!genus || genus.startsWith('Non ')) continue;
    if (/^(?:Abelia|Buddleja|Chaenomeles|Chimonanthus|Cotoneaster|Exochorda|Genista|Hamamelis|Lonicera|Philadelphus|Stachyurus|Wisteria)$/.test(genus)) continue;
    let species = row.espece?.trim().replace(/^(?:(?:Fleur|Fruit) )?n\. sp\.$/, '');
    let name = [genus, species].filter(Boolean).join(' ').replace(/\s+/g, ' ');
    if (/^(?:Aesculus parviflora|Cornus sanguinea|Elaeagnus (?:commutata|umbellata)|Juniperus sabina|Ligustrum (?:ovalifolium|sinense|vulgare|vulgaris)|Prunus (?:glandulosa|japonica)|Salix (?:aurita|exigua|humilis var\. microphylla|purpurea|rosmarinifolia)|Sophora flavescens|Viburnum tinus)$/.test(name)) continue;
    let cultivar = row.varieteoucultivar?.replace(/["']/g, '').trim();
    if (cultivar) name += ` '${cultivar}'`;
    if (!row.geo_point_2d) continue;
    let { lat, lon } = row.geo_point_2d;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 48.7 && lat < 49 && lon > 2.15 && lon < 2.5);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'paris_fr.json'), JSON.stringify(trees, null, 2));
  let conflicts = [...sites.values()].filter(row => row === null).length;
  console.log(`paris_fr: ${trees.length} trees; ${rows.length - trees.length} sites omitted (${conflicts} conflicting IDs)`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
