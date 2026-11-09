#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CityUtil } from './city_util';

interface Tree {
  attributes: {
    GESP_C_PK: number;
    ESPECIE_VA: string | null;
    OCUPACAO: string | null;
  };
  geometry: { x: number; y: number } | null;
}

// Municipio de Lisboa, Arvoredo; CC0, declared in the municipal ArcGIS item.
// https://www.arcgis.com/home/item.html?id=d2eb1eb1cfae400496bec1aeec4e25b2
// The service includes vacant, eliminated, stump, paved and dry-tree positions.
// Only occupied living-tree positions are imported. Some are actually shrubs,
// vines or herbaceous plants despite the source's tree classification.
// Includes other public/private managers. Mapping is not legally certified;
// November 2026 service edits are not a citywide survey date.
function botanicalName(value: string | null): string | undefined {
  if (!value) return;
  let name = value.replace(/\s+/g, ' ').trim();
  if (!name || /^(?:Não identificada|Em atualização|Palmeira|Bambu)\b/.test(name)) return;
  assert(/^(?:x )?[A-Z][a-z]+(?:\s|$)/.test(name), `Unexpected Lisbon botanical name: ${name}`);
  if (/^(?:Agave|Aloysia|Berberis|Bougainvillea|Brugmansia|Buddleja|Cortaderia|Cotoneaster|Datura|Duranta|Euonymus|Hibiscus|Hydrangea|Jasminum|Justicia|Lantana|Musa|Nerium|Opuntia|Phyllostachys|Phymosia|Plumbago|Polygala|Pyracantha|Ricinus|Rosa|Rosmarinus|Sambucus|Solanum|Spiraea|Strelitzia|Ulex|Viburnum|Vitis|Wisteria)\b/.test(name)) return;
  if (/^(?:Prunus (?:laurocerasus|spinosa)|Ligustrum (?:ovalifolium|sinense|vulgare)|Euphorbia neriifolia)\b/.test(name)) return;
  // Resista is a resistant-elm selection group, not a species epithet.
  name = name.replace(/^Ulmus x resista(?:\s.*)?$/, 'Ulmus');
  return name;
}

async function main() {
  let rows: Tree[] = await CityUtil.fetchArcGis(
    'https://services.arcgis.com/1dSrzEWVQn5kHHyK/arcgis/rest/services/Ambiente_DMEVAE/FeatureServer/0',
    { fields: 'GESP_C_PK,ESPECIE_VA,OCUPACAO', returnGeometry: true, verifyComplete: true });
  let trees: { lat: number; lon: number; name: string }[] = [];
  for (let row of rows) {
    assert(row.attributes.ESPECIE_VA === null || typeof row.attributes.ESPECIE_VA === 'string');
    if (row.attributes.OCUPACAO !== 'Árvore') continue;
    let name = botanicalName(row.attributes.ESPECIE_VA);
    if (!name || !row.geometry) continue;
    let { x: lon, y: lat } = row.geometry;
    assert(Number.isFinite(lat) && Number.isFinite(lon));
    assert(lat > 38.65 && lat < 38.85 && lon > -9.25 && lon < -9.05);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  fs.writeFileSync(path.join(__dirname, 'lisbon_pt.json'), JSON.stringify(trees, null, 2));
  console.log(`lisbon_pt: ${trees.length} trees; ${rows.length - trees.length} sites omitted`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
