#!/usr/bin/env npx tsx

// Uploads the downloadable tiles written by build_data (z/x/y.bin plus tiles_manifest.bin) to the
// public Google Cloud Storage bucket, under a version prefix.
//
// usage: npx tsx upload.ts [tiles dir] [--version v1] [--dry-run]
//   tiles dir   defaults to ./tiles (build_data's third argument)
//   --version   path prefix in the bucket, defaults to v1; change it only when the binary
//               format changes in a way older apps can't read
//   --dry-run   only show what would be uploaded and deleted
//
// Requires the gcloud CLI, signed in to an account that can write to the bucket.
// Tiles are mirrored: files in the bucket that are no longer in the tiles dir are deleted.
// The manifest is uploaded last, so a client never sees a manifest that refers to missing tiles.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BUCKET = 'gs://trees-tiles';
const PROJECT = 'trees-1543002995860';
const CACHE_CONTROL = 'public, max-age=86400';
const MANIFEST = 'tiles_manifest.bin';

function main() {
  let args = process.argv.slice(2);
  let dryRun = false;
  let version = 'v1';
  let dir = './tiles';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--version') version = args[++i];
    else if (args[i].startsWith('--')) fail(`unknown option ${args[i]}`);
    else dir = args[i];
  }
  dir = path.resolve(dir);

  if (!version || !/^v\d+$/.test(version)) {
    fail(`invalid version "${version}" (expected e.g. v1)`);
  }
  if (!fs.existsSync(path.join(dir, MANIFEST))) {
    fail(`${dir} does not contain ${MANIFEST}; run build_data with a download directory first`);
  }
  let tileCount = countFiles(dir) - 1;
  if (tileCount < 1) {
    fail(`${dir} contains no tiles`);
  }

  let destination = `${BUCKET}/${version}`;
  console.log(`uploading ${tileCount} tiles from ${dir} to ${destination}${dryRun ? ' (dry run)' : ''}`);

  let common = ['--project', PROJECT];

  // tiles first, then the manifest
  gcloud(['storage', 'rsync', dir, destination, '--recursive', '--checksums-only', '--delete-unmatched-destination-objects',
          '--exclude', `^${MANIFEST.replace('.', '\\.')}$`, '--cache-control', CACHE_CONTROL, ...(dryRun ? ['--dry-run'] : []), ...common]);
  if (dryRun) return;
  gcloud(['storage', 'cp', path.join(dir, MANIFEST), `${destination}/${MANIFEST}`,
          '--cache-control', CACHE_CONTROL, ...common]);

  console.log(`done: https://storage.googleapis.com/${BUCKET.replace('gs://', '')}/${version}/${MANIFEST}`);
}

function countFiles(dir: string): number {
  let count = 0;
  for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
  }
  return count;
}

function gcloud(args: string[]) {
  let result = spawnSync('gcloud', args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    fail(`gcloud ${args.slice(0, 2).join(' ')} failed${result.error ? `: ${result.error.message}` : ''}`);
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main();
