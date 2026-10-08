/**
 * @fileoverview Shell-side guarantees applied to every engine's verdict, whichever engine runs:
 * the shape is validated, the level is never below the highest hard floor among the reasons
 * (so an LLM can never talk a hard signal down), the content hash is computed here, and the
 * advice text comes from src/core/advice.
 */

import { actionsFor, summaryFor } from './advice';
import { contentHashOf, MAX_SCAN_TEXT } from './hash';
import { LEVEL_MIN_SCORE, levelFromScore, maxLevel } from './levels';
import { CATEGORIES, LEVELS, REASON_SOURCES, type Category, type Level, type Reason, type ScanInput, type Verdict } from './types';

const MAX_REASONS = 40;
const MAX_REASON_TEXT = 600;
const MAX_LIST = 50;

function str(x: unknown, max: number): string {
  return typeof x === 'string' ? x.slice(0, max) : '';
}

function strList(x: unknown, maxLen = 2048): string[] {
  if (!Array.isArray(x)) return [];
  return [...new Set(x.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= maxLen))].slice(0, MAX_LIST);
}

function isCategory(x: unknown): x is Category {
  return typeof x === 'string' && (CATEGORIES as readonly string[]).includes(x);
}

function isLevel(x: unknown): x is Level {
  return typeof x === 'string' && (LEVELS as readonly string[]).includes(x);
}

function cleanReason(r: unknown): Reason | null {
  const x = r as Partial<Reason> | null;
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id) return null;
  const en = str(x.text?.en, MAX_REASON_TEXT);
  if (!en) return null;
  const weight = typeof x.weight === 'number' && Number.isFinite(x.weight) ? Math.max(-1, Math.min(1, x.weight)) : 0;
  const out: Reason = {
    id: x.id.slice(0, 80),
    weight,
    source: (REASON_SOURCES as readonly string[]).includes(x.source as string) ? (x.source as Reason['source']) : 'rule',
    text: { en, pidgin: str(x.text?.pidgin, MAX_REASON_TEXT) || en },
  };
  if (isCategory(x.category)) out.category = x.category;
  if (weight > 0 && isLevel(x.floor)) out.floor = x.floor;
  return out;
}

/**
 * Make an engine's verdict safe to store and show: validate its shape, enforce hard floors,
 * recompute the content hash and advice, and stamp which engine produced it.
 */
export function normalizeVerdict(raw: Verdict, input: ScanInput, engine?: Verdict['engine']): Verdict {
  const all = (Array.isArray(raw?.reasons) ? raw.reasons.slice(0, 1000) : []).map(cleanReason).filter((r): r is Reason => r !== null);
  // Floors count even from reasons that are trimmed from the list.
  const floor = all.reduce<Level>((f, r) => (r.floor ? maxLevel(f, r.floor) : f), 'SAFE');
  const reasons = all.sort((a, b) => b.weight - a.weight).slice(0, MAX_REASONS);
  let score = typeof raw?.score === 'number' && Number.isFinite(raw.score) ? Math.round(Math.max(0, Math.min(100, raw.score))) : 0;
  const level = maxLevel(maxLevel(isLevel(raw?.level) ? raw.level : 'SAFE', levelFromScore(score)), floor);
  score = Math.max(score, LEVEL_MIN_SCORE[level]);
  const category = level === 'SAFE' ? null : isCategory(raw?.category) ? raw.category : null;
  const ind = raw?.indicators;
  const trustedDomains = strList(ind?.trustedDomains, 253);
  const ocrText = str(raw?.ocrText, MAX_SCAN_TEXT).trim();

  return {
    level,
    score,
    category,
    reasons,
    actions: actionsFor(level, category),
    summary: summaryFor(level, category),
    indicators: {
      urls: strList(ind?.urls),
      domains: strList(ind?.domains, 253),
      phones: strList(ind?.phones, 32),
      accounts: strList(ind?.accounts, 32),
      emails: strList(ind?.emails, 254),
      wallets: strList(ind?.wallets, 128),
      ...(trustedDomains.length ? { trustedDomains } : {}),
    },
    usedLlm: raw?.usedLlm === true,
    fingerprint: typeof raw?.fingerprint === 'string' && raw.fingerprint.length <= 128 ? raw.fingerprint : null,
    contentHash: contentHashOf(input),
    ...(ocrText ? { ocrText } : {}),
    ...(engine ? { engine } : {}),
  };
}
