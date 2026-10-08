/**
 * @fileoverview Default reputation policy and an in-memory store (tests, offline use).
 */

import type { ReputationPolicy } from './engine';
import type { FingerprintEntry, IndicatorInfo, IndicatorType, ReputationStore } from './types';

export const DEFAULT_REPUTATION_POLICY: ReputationPolicy = {
  communityConfidence: (reports) => Math.min(0.6, reports / (reports + 4)),
  confirmedAt: 0.85,
  reviewerConfidence: 0.95,
  minReportsToShow: 2,
};

export class MemoryReputationStore implements ReputationStore {
  private indicators = new Map<string, IndicatorInfo>();
  private fps: FingerprintEntry[] = [];

  add(info: IndicatorInfo): this {
    this.indicators.set(`${info.type}:${info.value}`, info);
    return this;
  }

  addFingerprint(entry: FingerprintEntry): this {
    this.fps.push(entry);
    return this;
  }

  async lookup(type: IndicatorType, value: string): Promise<IndicatorInfo | null> {
    return this.indicators.get(`${type}:${value}`) ?? null;
  }

  async fingerprints(): Promise<FingerprintEntry[]> {
    return this.fps;
  }
}
