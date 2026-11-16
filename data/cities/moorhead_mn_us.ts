#!/usr/bin/env npx tsx

import path from 'node:path';
import { exportInventory, Options, Species } from './treeplotter';

// Use the city's live botanical dictionary rather than its older genus-only ArcGIS mirror.
const corrections = new Map([
  ['Quarcus', 'Quercus'],
  ['Aesculas', 'Aesculus'],
  ['Vibernum', 'Viburnum'],
  ['Magnolie', 'Magnolia'],
  ['Spirea', 'Spiraea']
]);
const excluded = new Set(['N/A', 'Conifer', 'Betulaceae', 'Berberidinae']);

export function botanicalName(species: Species): string | undefined {
  let genus = species.genus?.trim();
  if (genus) genus = corrections.get(genus) ?? genus;
  if (!genus || excluded.has(genus) || !/^[A-Z][a-z]+$/.test(genus)) genus = undefined;
  let name = species.latin_name?.trim();
  if (!name) return genus;
  if (excluded.has(name)) return;
  // Conflicting dictionary fields support only a genus-level identification.
  if (genus && name.split(/\s+/)[0] !== genus) return genus;
  return name;
}

export const options: Options = {
  bounds: [-96.81, 46.8, -96.68, 46.96],
  requireLivingStatus: true,
  botanicalName
};

////////////////////////////////////////

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  exportInventory('moorhead_mn_us', 'https://pg-cloud.com/Moorhead/', options).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
