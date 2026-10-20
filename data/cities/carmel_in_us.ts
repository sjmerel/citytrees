#!/usr/bin/env npx tsx

import { CommunityUtil } from '../community_util';

CommunityUtil.indiana('Carmel', 'carmel_in_us.json').catch(error => {
  console.error(error);
  process.exitCode = 1;
});
