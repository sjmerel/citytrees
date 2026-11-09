#!/usr/bin/env npx tsx

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { CityUtil } from './city_util';

// Metropolitan roads only; ward surveys date to fiscal years 2020-2023.
// CC BY 4.0: https://catalog.data.metro.tokyo.lg.jp/ja/dataset/t000014d2000000029
// Partial botanical coverage: omit unmapped labels rather than guess species.
// Tokyo's own guide supplies the first group (cherries/plane trees at genus).
// https://www.kensetsu.metro.tokyo.lg.jp/documents/d/kensetsu/000008932
const species: Record<string, string> = {
  'イチョウ': 'Ginkgo biloba',
  'ハナミズキ': 'Cornus florida',
  'サクラ': 'Prunus',
  'サクラ類': 'Prunus',
  'プラタナス': 'Platanus',
  'スズカケノキ': 'Platanus',
  'スズカケノキ属': 'Platanus',
  'トウカエデ': 'Acer buergerianum',
  'ケヤキ': 'Zelkova serrata',
  'クスノキ': 'Cinnamomum camphora',
  'ヤマモモ': 'Myrica rubra',
  // FFPRI's profiles verify these exact labels, Latin names and tree habits.
  // https://www.ffpri.go.jp/kys/business/jumokuen/jumoku/jumoku50on.html
  // Individual profiles are zukan/<romanized name>.html beneath that directory.
  'アオギリ': 'Firmiana simplex',
  'アキニレ': 'Ulmus parvifolia',
  'イロハモミジ': 'Acer palmatum',
  'ウバメガシ': 'Quercus philyraeoides',
  'エンジュ': 'Sophora japonica',
  'クロガネモチ': 'Ilex rotunda',
  'サルスベリ': 'Lagerstroemia indica',
  'シラカシ': 'Quercus myrsinaefolia',
  'ソヨゴ': 'Ilex pedunculosa',
  'トチノキ': 'Aesculus turbinata',
  'ナンキンハゼ': 'Triadica sebifera',
  'フウ': 'Liquidambar formosana',
  'ホルトノキ': 'Elaeocarpus zollingeri',
  'マテバシイ': 'Lithocarpus edulis',
  'モッコク': 'Ternstroemia gymnanthera',
  'モミジバフウ': 'Liquidambar styraciflua',
  'ヤマボウシ': 'Cornus kousa',
  'ユリノキ': 'Liriodendron tulipifera'
};

export function botanicalName(value: string): string | undefined {
  assert(typeof value === 'string');
  let label = value.trim();
  return Object.hasOwn(species, label) ? species[label] : undefined;
}

async function main() {
  let trees: { lat: number; lon: number; name: string }[] = [];
  let seen = new Set<string>();
  let unmapped: Record<string, number> = {};
  let duplicates = 0;
  let invalidCoordinates = 0;
  let total = 0;
  for (let file of [
    { name: 'tokyo_gairoju.csv', encoding: 'shift_jis', species: '樹種', lon: '経度', lat: '緯度' },
    { name: 'tokyo_tama_gairoju.csv', encoding: 'utf-8', species: 'name', lon: 'longitude', lat: 'latitude' }
  ]) {
    let response = await CityUtil.getWithRetry(
      `https://www.opendata.metro.tokyo.lg.jp/kensetsu/${file.name}`,
      { responseType: 'arraybuffer', timeout: 120000 });
    let text = new TextDecoder(file.encoding, { fatal: true }).decode(response.data);
    let rows: Record<string, string>[] = parse(text, { columns: true, skip_empty_lines: true, bom: true });
    assert(rows.length > 0);
    assert([file.species, file.lon, file.lat].every(key => Object.hasOwn(rows[0], key)),
      'Unexpected Tokyo CSV schema');
    for (let row of rows) {
      ++total;
      let label = row[file.species];
      let name = botanicalName(label);
      if (!name) {
        unmapped[label] = (unmapped[label] ?? 0) + 1;
        continue;
      }
      assert(row[file.lat].trim() && row[file.lon].trim(), 'Missing Tokyo tree coordinates');
      let lat = Number(row[file.lat]);
      let lon = Number(row[file.lon]);
      assert(Number.isFinite(lat) && Number.isFinite(lon));
      // Some Tama records repeat latitude in the longitude column.
      if (!(lat > 35.45 && lat < 35.95 && lon > 138.90 && lon < 139.95)) {
        ++invalidCoordinates;
        continue;
      }
      // No source IDs are published; collapse identical name/position observations.
      let key = JSON.stringify([lat, lon, name]);
      if (seen.has(key)) {
        ++duplicates;
        continue;
      }
      seen.add(key);
      trees.push({ lat, lon, name });
    }
  }
  assert(trees.length > 0);
  assert.equal(trees.length + duplicates + invalidCoordinates +
    Object.values(unmapped).reduce((a, b) => a + b, 0), total);
  fs.writeFileSync(path.join(__dirname, 'tokyo_jp.json'), JSON.stringify(trees, null, 2));
  console.log(JSON.stringify({
    city: 'tokyo_jp', source_count: total, final_count: trees.length, duplicates, invalidCoordinates, unmapped
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
