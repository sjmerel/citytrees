#!/usr/bin/env npx tsx

import fs from 'node:fs';
import path from 'node:path';
import { DataUtil } from '../data_util';

// City of Red Deer in-service park trees; CmnNameSpecies embeds the scientific binomial
// in the last/deepest parenthetical group, e.g.
//   "Poplar (Northwest) (Populus x jackii (Northwest))" -> "Populus x jackii"
// Scan backward from the end of the string to find the last balanced parenthetical
// group, then strip any further nested trailing parenthetical from its contents.
function extractScientificName(raw: string): string {
  const s = raw.trim();
  const lastClose = s.lastIndexOf(')');
  if (lastClose === -1) return s;
  // Find the matching '(' for this last ')'.
  let depth = 0;
  let openIdx = -1;
  for (let i = lastClose; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(') {
      depth--;
      if (depth === 0) {
        openIdx = i;
        break;
      }
    }
  }
  if (openIdx === -1) return s;
  let inner = s.slice(openIdx + 1, lastClose).trim();
  // Strip any further nested trailing parenthetical inside this group, e.g. "(Northwest)".
  inner = inner.replace(/\s*\([^()]*\)\s*$/, '').trim();
  return inner || s;
}

async function main() {
  const endpoint = 'https://arcgis.reddeer.ca/arcgis/rest/services/CoRD_View_Layers/PARK_Trees_inservice/FeatureServer/0';
  // NOTE: a combined multi-clause WHERE filter (NULL/blank/NOT LIKE) triggers this
  // server's WAF with an HTTP 403, so fetch everything and filter client-side instead.
  const rows = await DataUtil.fetchArcGis(endpoint, {
    fields: 'CmnNameSpecies',
    where: '1=1',
    returnGeometry: true
  });

  const trees = rows.flatMap((o: any) => {
    const raw = (o.attributes.CmnNameSpecies ?? '').trim();
    if (!raw || raw.includes('Unknown')) return [];
    const lat = o.geometry?.y;
    const lon = o.geometry?.x;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const name = extractScientificName(raw);
    if (!name) return [];
    return [{ name, lat, lon }];
  });

  fs.writeFileSync(path.join(__dirname, 'reddeer_ab_ca.json'), JSON.stringify(trees));
  console.log(`wrote ${trees.length} trees to reddeer_ab_ca.json`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
