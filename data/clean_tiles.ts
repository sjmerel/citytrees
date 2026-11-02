#!/usr/bin/env npx tsx

// Deletes all data set directories in tiles/ except the one named in tiles/latest.txt.

import fs from 'node:fs';
import path from 'node:path';

function main() {
  const dir = path.join(import.meta.dirname, 'tiles');
  const timestamp = fs.readFileSync(path.join(dir, 'latest.txt'), 'utf8').trim();
  if (!fs.existsSync(path.join(dir, timestamp))) {
    throw new Error(`directory for latest timestamp ${timestamp} not found`);
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== timestamp) {
      console.log(`deleting ${entry.name}`);
      fs.rmSync(path.join(dir, entry.name), { recursive: true });
    }
  }
}

main();
