/**
 * @fileoverview Verdict level helpers shared by every engine and the app shell.
 */

import { LEVELS, type Level } from './types';

export const LEVEL_MIN_SCORE: Record<Level, number> = {
  SAFE: 0,
  SUSPICIOUS: 25,
  LIKELY_SCAM: 50,
  DANGEROUS: 75,
};

export function levelFromScore(score: number): Level {
  if (score >= LEVEL_MIN_SCORE.DANGEROUS) return 'DANGEROUS';
  if (score >= LEVEL_MIN_SCORE.LIKELY_SCAM) return 'LIKELY_SCAM';
  if (score >= LEVEL_MIN_SCORE.SUSPICIOUS) return 'SUSPICIOUS';
  return 'SAFE';
}

export function maxLevel(a: Level, b: Level): Level {
  return LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b;
}

export function levelAtLeast(level: Level, min: Level): boolean {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(min);
}
