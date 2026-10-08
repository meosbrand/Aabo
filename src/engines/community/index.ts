/**
 * @fileoverview The community detection engine: open source, simple, explainable. It covers the
 * most common and most damaging patterns (code theft, malicious apps, card/PIN requests, fake
 * prizes and fees, suspicious links) plus community reports and threat feeds.
 *
 * Deployments that need stronger detection load a separately distributed engine through the
 * same ScanEngine contract (see docs/open-core.md).
 */

import { ENGINE_API_VERSION, type ScanEngine } from '@/core/engine';
import { DEFAULT_REPUTATION_POLICY } from '@/core/reputation-memory';
import { analyzeCommunity } from './analyze';
import { basicGuardianPolicy } from './guardian';
import { COMMUNITY_FEED_POLICY } from './policies';
import { COMMUNITY_PROMPT } from './prompt';

export const COMMUNITY_ENGINE_VERSION = '1.0.0';

export function createCommunityEngine(): ScanEngine {
  const reputation = DEFAULT_REPUTATION_POLICY;
  return {
    id: 'community',
    version: COMMUNITY_ENGINE_VERSION,
    apiVersion: ENGINE_API_VERSION,
    analyze: (input, deps) => analyzeCommunity(input, deps, { confirmedAt: reputation.confirmedAt }),
    llmPrompt: COMMUNITY_PROMPT,
    reputation,
    feeds: COMMUNITY_FEED_POLICY,
    guardian: basicGuardianPolicy,
  };
}

export const apiVersion = ENGINE_API_VERSION;
export const createEngine = createCommunityEngine;
