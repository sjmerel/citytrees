#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import proj4 from 'proj4';
import { CityUtil } from './city_util';

interface Tree {
  TreeID: string;
  TreeType: string;
  TWD97X: string;
  TWD97Y: string;
}

// Taipei street trees, not the separate vacant TreeHole resources.
// https://data.gov.tw/en/datasets/128274 (Open Government Data License 1.0).
// SurveyDate is the observation date, not the daily UpdDate/export timestamp.
// Partial crosswalk from Ministry of Agriculture profiles 27037 through 27062:
// https://kmweb.moa.gov.tw/subject/subject.php?id=3307
// Normalize 台/臺 spelling. Unverified labels (including shrubs/dead trees)
// are omitted and reported, never translated into guessed botanical names.
const species: Record<string, string> = {
  '相思樹': 'Acacia confusa',
  '樟樹': 'Cinnamomum camphora',
  '榕樹': 'Ficus microcarpa',
  '台灣欒樹': 'Koelreuteria formosana',
  '小葉欖仁': 'Terminalia',
  '印度橡膠樹': 'Ficus elastica',
  '蒲葵': 'Livistona chinensis',
  '茄苳': 'Bischofia javanica',
  '桃花心木': 'Swietenia',
  '白千層': 'Melaleuca',
  '楓香': 'Liquidambar formosana',
  '木棉': 'Bombax malabarica',
  '黑板樹': 'Alstonia scholaris',
  '菩提樹': 'Ficus religiosa',
  '榔榆': 'Ulmus parvifolia',
  '櫸': 'Zelkova serrata',
  '台灣櫸': 'Zelkova serrata',
  '大花紫薇': 'Lagerstroemia speciosa',
  '阿勃勒': 'Cassia fistula',
  '落羽松': 'Taxodium distichum',
  '肯氏南洋杉': 'Araucaria cunninghamii',
  '欖仁': 'Terminalia catappa',
  '欖仁樹': 'Terminalia catappa',
  '水黃皮': 'Pongamia pinnata',
  '苦楝': 'Melia azedarach',
  '櫻花': 'Prunus',
  '青剛櫟': 'Cyclobalanopsis glauca'
};
// Use genus only for ambiguous common names, not an asserted species.
// White paperbarks have differing scientific labels in government sources:
// https://eculture.gov.taipei/trees/zh-tw/tree/2268
// https://www.forest.gov.tw/0005016

export function botanicalName(value: string): string | undefined {
  assert(typeof value === 'string');
  let label = value.trim().replace(/臺/g, '台');
  return Object.hasOwn(species, label) ? species[label] : undefined;
}

const twd97 = '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs';

export function coordinates(x: string, y: string): { lat: number; lon: number } {
  assert(typeof x === 'string' && x.trim() && typeof y === 'string' && y.trim());
  let east = Number(x);
  let north = Number(y);
  assert(Number.isFinite(east) && Number.isFinite(north));
  let [lon, lat] = proj4(twd97, 'EPSG:4326', [east, north]);
  assert(Number.isFinite(lat) && Number.isFinite(lon));
  assert(lat > 24.90 && lat < 25.25 && lon > 121.40 && lon < 121.70);
  return { lat, lon };
}

async function main() {
  let response = await CityUtil.getWithRetry('https://tppkl.blob.core.windows.net/blobfs/TaipeiTree.json',
    { timeout: 120000 });
  let rows: Tree[] = response.data;
  assert(Array.isArray(rows) && rows.length > 0);
  let ids = new Set<string>();
  let trees: { lat: number; lon: number; name: string }[] = [];
  let unmapped: Record<string, number> = {};
  for (let row of rows) {
    assert(typeof row.TreeID === 'string' && row.TreeID.length > 0 && !ids.has(row.TreeID),
      'Invalid/repeated Taipei tree ID');
    ids.add(row.TreeID);
    let name = botanicalName(row.TreeType);
    if (!name) {
      unmapped[row.TreeType] = (unmapped[row.TreeType] ?? 0) + 1;
      continue;
    }
    let { lat, lon } = coordinates(row.TWD97X, row.TWD97Y);
    trees.push({ lat, lon, name });
  }
  assert(trees.length > 0);
  assert.equal(trees.length + Object.values(unmapped).reduce((a, b) => a + b, 0), rows.length);
  fs.writeFileSync(path.join(__dirname, 'taipei_tw.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({ city: 'taipei_tw', source_count: rows.length, final_count: trees.length, unmapped }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
