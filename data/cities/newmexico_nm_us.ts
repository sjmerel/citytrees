#!/usr/bin/env npx tsx

import path from 'node:path';
import { exportInventory, Options } from './treeplotter';

// Participating communities with mixed survey dates. Prefer the separate
// Santa Fe and Las Cruces inventories, and exclude the source's test organization.
export const options: Options = {
  bounds: [-109.1, 31.2, -102.9, 37.1],
  coveredOrganizations: /^(?:(?:City of )?(?:Santa Fe(?: Original)?|Las Cruces)(?: -|$)|\*{3}Test Org\*{3}$)/i
};

////////////////////////////////////////

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  exportInventory('newmexico_nm_us', 'https://pg-cloud.com/NewMexico/', options).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
