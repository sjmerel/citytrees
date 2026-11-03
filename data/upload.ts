#!/usr/bin/env npx tsx

// uploads tiles, manifest, and types to google cloud storage bucket

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';

const BUCKET = 'gs://trees-tiles';
const PROJECT = 'trees-1543002995860';

function main() {
  let dir = path.resolve('./tiles');

  let timestamp = fs.readFileSync(`${dir}/latest.txt`, 'utf8').trim();
  execSync(`gcloud storage cp -r ${dir}/${timestamp} ${BUCKET}/v1/${timestamp}  --project ${PROJECT}`, { stdio: 'inherit' });
  execSync(`gcloud storage cp    ${dir}/latest.txt   ${BUCKET}/v1/              --cache-control=no-store --project ${PROJECT}`, { stdio: 'inherit' });
}

main();
