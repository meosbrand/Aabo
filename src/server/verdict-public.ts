/**
 * @fileoverview What leaves the server. Engine internals (signal weights, hard floors,
 * fingerprints and engine-specific signal ids) stay on the server; clients and API callers
 * get the explanation, the level and the indicators.
 */

import { sha256 } from '@/core/hash';
import type { Reason, Verdict } from '@/core/types';

/** Reason id prefixes that are part of the public vocabulary and pass through unchanged. */
const PUBLIC_PREFIXES = ['c.', 'safe.', 'ocr.', 'image.', 'engine.', 'llm.'];

export function publicReasonId(id: string): string {
  return PUBLIC_PREFIXES.some((p) => id.startsWith(p)) ? id : `r_${sha256(id).slice(0, 8)}`;
}

export function toPublicReason(r: Reason): Reason {
  const out: Reason = { id: publicReasonId(r.id), weight: Math.sign(r.weight), source: r.source, text: { en: r.text.en, pidgin: r.text.pidgin } };
  if (r.category) out.category = r.category;
  return out;
}

export function toPublicVerdict(v: Verdict): Verdict {
  return {
    level: v.level,
    score: v.score,
    category: v.category,
    reasons: v.reasons.map(toPublicReason),
    actions: v.actions,
    summary: v.summary,
    indicators: v.indicators,
    usedLlm: v.usedLlm,
    fingerprint: null,
    contentHash: v.contentHash,
    ...(v.ocrText ? { ocrText: v.ocrText } : {}),
    ...(v.engine ? { engine: { id: v.engine.id, version: v.engine.version, ...(v.engine.fallback ? { fallback: true } : {}) } } : {}),
  };
}
