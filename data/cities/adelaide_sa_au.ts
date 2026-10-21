#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

// Geometry column is Web Mercator (EPSG:3857) metres.
function fromWebMercator(x: number, y: number) {
  let lon = x / 6378137 * 180 / Math.PI;
  let lat = (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180 / Math.PI;
  return { lat, lon };
}

async function main() {
  let endpoint = 'https://s3.ap-southeast-2.amazonaws.com/dmzweb.adelaidecitycouncil.com/OpenData/Street_Trees/Street_Trees.csv';
  let response = await axios.get(endpoint, { responseType: 'stream' });
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true }));
  let trees = [];

  for await (let row of parser) {
    let raw = (row['Species Name (Inspection)'] ?? '').trim().replace(/\s+/g, ' ');
    let match = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(row['Geometry'] ?? '');
    if (!raw || !match) {
      continue;
    }
    let { lat, lon } = fromWebMercator(Number(match[1]), Number(match[2]));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    // Source is title-cased ("Platanus X Acerifolia"); restore botanical casing.
    let words = raw.split(' ').map((w: string) => w.toLowerCase());
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    trees.push({ name: words.join(' '), lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'adelaide_sa_au.json'), JSON.stringify(trees, null, 2));
  console.log(trees.length);
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
