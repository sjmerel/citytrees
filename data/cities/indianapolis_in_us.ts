#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.indiana('Indianapolis', 'indianapolis_in_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
