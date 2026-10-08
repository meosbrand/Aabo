/**
 * @fileoverview Offline evaluation of any engine on a labelled sample set.
 * Used by `npm run eval` and the engine threshold tests.
 */

import type { ScanEngine } from './engine';
import { levelAtLeast } from './levels';
import type { Category, EngineDeps, Level, Verdict } from './types';

export interface LabelledSample {
  label: 'scam' | 'ham';
  text: string;
  /** Expected dominant category (scams only, optional). */
  category?: Category;
  /** Minimum level expected (defaults: scam → SUSPICIOUS). */
  minLevel?: Level;
  fileName?: string;
}

export interface EvalRow {
  sample: LabelledSample;
  verdict: Verdict;
  ok: boolean;
  problem?: string;
}

export interface EvalReport {
  rows: EvalRow[];
  scams: number;
  hams: number;
  /** Scams flagged at SUSPICIOUS or above. */
  recall: number;
  /** Scams flagged at LIKELY_SCAM or above. */
  strictRecall: number;
  /** Ham called LIKELY_SCAM or DANGEROUS. */
  falsePositiveRate: number;
  /** Ham called SUSPICIOUS (soft false alarms). */
  softAlarmRate: number;
  confusion: Record<'scam' | 'ham', Record<Level, number>>;
}

export async function evaluate(engine: Pick<ScanEngine, 'analyze'>, samples: LabelledSample[], deps: EngineDeps = {}): Promise<EvalReport> {
  const rows: EvalRow[] = [];
  const confusion: EvalReport['confusion'] = {
    scam: { SAFE: 0, SUSPICIOUS: 0, LIKELY_SCAM: 0, DANGEROUS: 0 },
    ham: { SAFE: 0, SUSPICIOUS: 0, LIKELY_SCAM: 0, DANGEROUS: 0 },
  };
  for (const sample of samples) {
    const verdict = await engine.analyze({ text: sample.text, fileName: sample.fileName, channel: 'web' }, deps);
    confusion[sample.label][verdict.level]++;
    let problem: string | undefined;
    if (sample.label === 'scam') {
      const min = sample.minLevel ?? 'SUSPICIOUS';
      if (!levelAtLeast(verdict.level, min)) problem = `expected ≥ ${min}, got ${verdict.level} (${verdict.score})`;
      else if (sample.category && verdict.category !== sample.category) problem = `category ${verdict.category} ≠ ${sample.category}`;
    } else if (levelAtLeast(verdict.level, 'LIKELY_SCAM')) {
      problem = `legit message flagged ${verdict.level} (${verdict.score})`;
    }
    rows.push({ sample, verdict, ok: !problem, problem });
  }
  const scamRows = rows.filter((r) => r.sample.label === 'scam');
  const hamRows = rows.filter((r) => r.sample.label === 'ham');
  const frac = (n: number, d: number) => (d ? n / d : 0);
  return {
    rows,
    scams: scamRows.length,
    hams: hamRows.length,
    recall: frac(scamRows.filter((r) => levelAtLeast(r.verdict.level, 'SUSPICIOUS')).length, scamRows.length),
    strictRecall: frac(scamRows.filter((r) => levelAtLeast(r.verdict.level, 'LIKELY_SCAM')).length, scamRows.length),
    falsePositiveRate: frac(hamRows.filter((r) => levelAtLeast(r.verdict.level, 'LIKELY_SCAM')).length, hamRows.length),
    softAlarmRate: frac(hamRows.filter((r) => r.verdict.level === 'SUSPICIOUS').length, hamRows.length),
    confusion,
  };
}
