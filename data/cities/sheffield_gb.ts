#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

async function main() {
  let endpoint = 'https://sheffieldcitycouncil.cloud.esriuk.com/server/rest/services/AGOL/INSPIRE/FeatureServer/14';
  let rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'featuretypename',
    where: "featuretypename IS NOT NULL",
    returnGeometry: true
  });

  let trees = [];
  for (let o of rows) {
    let raw = (o.attributes.featuretypename ?? '').trim();
    let name = raw.replace(/\s*['"‘’].*$/, '').replace(/\s+/g, ' ').trim();
    if (!/^[A-Z][a-z]+( (x |× )?[a-z-]+\.?)?$/i.test(name) || /^(Other|Various|Unknown|Unclassified|Cherry|Mixed|Hedge)\b/i.test(name) || !o.geometry) {
      continue;
    }
    trees.push({ name, lat: o.geometry.y, lon: o.geometry.x });
  }

  fs.writeFileSync(path.join(__dirname, 'sheffield_gb.json'), JSON.stringify(trees, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
