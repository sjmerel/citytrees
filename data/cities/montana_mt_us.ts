#!/usr/bin/env npx tsx

import path from 'node:path';
import { exportInventory, Options } from './treeplotter';

// DNRC's participating communities, with mixed survey dates. Prefer the
// separately registered municipal inventories for Bozeman and Missoula.
export const options: Options = {
  bounds: [-116.1, 44.3, -104, 49.1],
  coveredOrganizations: /^(?:City of )?(?:Bozeman|Missoula)(?: -|$)/i
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  exportInventory('montana_mt_us', 'https://pg-cloud.com/Montana/', options).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
