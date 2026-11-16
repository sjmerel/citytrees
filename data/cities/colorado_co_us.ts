#!/usr/bin/env npx tsx

import path from 'node:path';
import { exportInventory, Options } from './treeplotter';

// CO-TreeView's participating organizations, with mixed survey dates. Exclude
// municipal organizations already covered by separate registered inventories.
export const options: Options = {
  bounds: [-109.1, 36.9, -102, 41.1],
  coveredOrganizations: /^(?:City of )?(?:Aspen|Aurora|Boulder|Denver|Durango|Grand Junction|Loveland)(?: -|$)/i
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  exportInventory('colorado_co_us', 'https://cotreeview.com/cotv/', options).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
