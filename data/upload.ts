#!/usr/bin/env npx tsx

// uploads tiles, manifest, and types to google cloud storage bucket

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';

const BUCKET = 'gs://trees-tiles';
const PROJECT = 'trees-1543002995860';

function main() {
  let args = process.argv.slice(2);
  let version = 'v1';
  let dir = path.resolve('./tiles');

  execSync(`gcloud storage rsync ${dir} ${BUCKET}/${version} --recursive --checksums-only --delete-unmatched-destination-objects --cache-control "public, max-age=86400" --project ${PROJECT}`, { stdio: 'inherit' });
}

main();
