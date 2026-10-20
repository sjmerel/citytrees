#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.wisconsin('Whitefish Bay', 'whitefishbay_wi_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
