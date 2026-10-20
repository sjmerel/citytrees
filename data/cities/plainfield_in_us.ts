#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.indiana('Plainfield', 'plainfield_in_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
