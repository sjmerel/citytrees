#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.wisconsin('New Berlin', 'newberlin_wi_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
