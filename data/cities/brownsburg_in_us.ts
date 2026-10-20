#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.indiana('Brownsburg', 'brownsburg_in_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
