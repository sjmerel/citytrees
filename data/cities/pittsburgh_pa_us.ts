#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

// The server intermittently returns 502, so retry.
async function get(url: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await axios.get(url, { responseType: 'stream' });
    } catch (error) {
      if (attempt >= 5) throw error;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

async function main() {
  let endpoint = 'https://data.wprdc.org/datastore/dump/1515a93c-73e3-4425-9b35-1cd11b2196da';
  let response = await get(endpoint);
  // The file mixes \r\n and \n line endings.
  let parser = response.data.pipe(parse({ bom: true, columns: true, skip_empty_lines: true, record_delimiter: ['\r\n', '\n'] }));
  let trees = [];

  // Stumps and vacant planting sites are stored with the placeholder text as the scientific name.
  let placeholder = /^(stump|vacant site)/i;

  for await (let row of parser) {
    let name = (row.scientific_name ?? '').trim();
    let lat = parseFloat(row.latitude);
    let lon = parseFloat(row.longitude);
    if (!name || placeholder.test(name) || row.condition === 'Dead' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    trees.push({ name, lat, lon });
  }

  fs.writeFileSync(path.join(__dirname, 'pittsburgh_pa_us.json'), JSON.stringify(trees, null, 2));
}


////////////////////////////////////////

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
