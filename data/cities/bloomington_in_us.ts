#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.indiana('Bloomington', 'bloomington_in_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
