/**
 * @fileoverview Runs the loaded detection engine with production dependencies (Prisma reputation
 * store, network URL intel, the configured LLM) and normalises what it returns.
 *
 * Every verdict goes through normalizeVerdict (src/core/normalize.ts), whichever engine is loaded.
 * Shared by the web app, the API and the messaging gateway.
 */

import type { ScamPromptPack, ScanEngine } from '@/core/engine';
import { MAX_SCAN_TEXT } from '@/core/hash';
import { normalizeVerdict } from '@/core/normalize';
import type { EngineDeps, ScanInput, Verdict } from '@/core/types';
import { COMMUNITY_PROMPT } from '@/engines/community/prompt';
import type { AiConfig } from './ai/config';
import { resolveAiConfig } from './ai/resolve';
import { OpenAICompatibleAnalyzer } from './ai/scam-analyzer';
import { builtinEngine, engineInfo, loadEngine } from './engine-loader';
import { urlIntelFor } from './integrations';
import { reputationStore } from './reputation-store';

export interface AnalyzeOptions {
  /** Organisation the scan runs for (selects its AI provider and intel keys). */
  orgId?: string | null;
  llmMode?: EngineDeps['llmMode'];
}

/**
 * The prompt an endpoint may receive. The loaded engine's own prompt goes only to the platform's
 * model; a customer's endpoint gets the community prompt (unless AABO_PRO_PROMPT_FOR_BYOK=1).
 */
export function promptFor(cfg: AiConfig, engine: ScanEngine): ScamPromptPack {
  const trusted = cfg.source === 'platform' || process.env.AABO_PRO_PROMPT_FOR_BYOK === '1';
  return trusted ? (engine.llmPrompt ?? COMMUNITY_PROMPT) : COMMUNITY_PROMPT;
}

export async function engineDepsFor(opts: AnalyzeOptions = {}): Promise<EngineDeps> {
  const [engine, ai, urlIntel] = await Promise.all([loadEngine(), opts.llmMode === 'never' ? null : resolveAiConfig(opts.orgId), urlIntelFor(opts.orgId)]);
  return {
    reputation: reputationStore,
    urlIntel,
    llm: ai ? new OpenAICompatibleAnalyzer(ai, promptFor(ai, engine)) : undefined,
    llmMode: opts.llmMode ?? 'auto',
  };
}

/** Analyse input with the loaded engine; falls back to the built-in engine if it throws. */
export async function analyzeInput(input: ScanInput, opts: AnalyzeOptions = {}): Promise<Verdict> {
  const engine = await loadEngine();
  const deps = await engineDepsFor(opts);
  const bounded: ScanInput = input.text && input.text.length > MAX_SCAN_TEXT ? { ...input, text: input.text.slice(0, MAX_SCAN_TEXT) } : input;
  let ran: ScanEngine = engine;
  let raw: Verdict;
  try {
    raw = await engine.analyze(bounded, deps);
  } catch (err) {
    const fallback = await builtinEngine();
    if (fallback === engine) throw err;
    console.error(`[aabo] engine ${engine.id} failed (${(err as Error).message}); using ${fallback.id}.`);
    ran = fallback;
    raw = await fallback.analyze(bounded, deps);
  }
  const fellBack = ran !== engine || Boolean(engineInfo()?.fallback);
  const verdict = normalizeVerdict(raw, input, { id: ran.id, version: ran.version, ...(fellBack ? { fallback: true } : {}) });
  if (verdict.usedLlm && deps.llm?.model) verdict.aiModel = deps.llm.model;
  return verdict;
}

export { normalizeVerdict };
