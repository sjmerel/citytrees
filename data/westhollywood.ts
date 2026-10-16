#!/usr/bin/env npx tsx

import axios from 'axios';
import fs from 'node:fs';

async function main() {

  let endpoint = 'https://data.weho.org/api/v3/views/qqwt-wx9z/query.json';
  let query = 'WHERE location_1.latitude != 0 AND location_1.longitude != 0';

  let response = await axios.post(
    endpoint,
    { query: `SELECT count(*) ${query}` },
  );
  const rowCount = response.data[0].count

  const pageSize = 1000;
  let allRows = [];
  let pageNumber = 1;

  for (;;) {
    let response = await axios.post(endpoint, {
      query: `SELECT * ${query}`,
      page: { 
        pageNumber: pageNumber, 
        pageSize: pageSize 
      }
    });

    let rows = response.data.map(o => ({
      lat: o.location_1.latitude,
      lon: o.location_1.longitude,
      name: o.botanicalname.trim()
    }));
    allRows.push(...rows);

    console.log(`${allRows.length}/${rowCount}`);
    if (rows.length < pageSize) {
      break;
    }
    ++pageNumber;
  }

  fs.writeFileSync('westhollywood.json', JSON.stringify(allRows, null, 2));
}

////////////////////////////////////////

(async () => {

try {
  await main();
  process.exit(0);
}
catch(error) {
  console.log(error);
  process.exit(1);
}

}) ();



