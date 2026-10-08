/**
 * @fileoverview LlmAnalyzer backed by any OpenAI-compatible model.
 *
 * Message text is untrusted: it is fenced and any `<message>` tags inside it are neutralised.
 * A customer's own endpoint (BYOK, `trusted: false`) only ever receives the community prompt and
 * coarse signals; the loaded engine's own prompt is reserved for the platform's model.
 */

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import type { ScamPromptPack } from '@/core/engine';
import type { LlmAnalyzer, LlmRequest, LlmResult } from '@/core/types';
import { completeJson } from './json';
import type { AiConfig } from './config';
import { withinPlatformCap } from './quota';
import { SCAM_FIELDS, SCAM_JSON_SCHEMA, ScamAssessmentSchema, toLlmResult } from './scam-schema';

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Neutralise anything that could close or open the message fence. */
export function escapeFence(s: string): string {
  return s.replace(/<(\/?)\s*message/gi, '‹$1message');
}

/** What an untrusted endpoint may see: no signal ids or weights, a coarse score. */
export function sanitizeForUntrusted(req: LlmRequest): LlmRequest {
  return {
    ...req,
    signals: req.signals.slice(0, 6).map((s) => s.replace(/^\S+ \([+-]?[\d.]+\):\s*/, '').slice(0, 200)),
    ruleScore: Math.floor(Math.max(0, Math.min(100, req.ruleScore)) / 25) * 25,
  };
}

export class OpenAICompatibleAnalyzer implements LlmAnalyzer {
  readonly vision: boolean;
  readonly trusted: boolean;
  readonly model: string;

  constructor(
    private readonly cfg: AiConfig,
    private readonly prompt: ScamPromptPack,
  ) {
    this.vision = cfg.vision;
    this.trusted = cfg.source === 'platform';
    this.model = cfg.model;
  }

  async analyze(req: LlmRequest): Promise<LlmResult | null> {
    if (!(await withinPlatformCap(this.cfg))) return null;
    const fenced: LlmRequest = {
      ...req,
      text: escapeFence(req.text),
      conversation: req.conversation?.map(escapeFence),
      context: req.context ? escapeFence(req.context) : undefined,
    };
    const safe = this.trusted ? fenced : sanitizeForUntrusted(fenced);
    const text = this.prompt.user(safe);
    // Formats most vision models accept; others (e.g. HEIC) are not sent, so the engine reports it could not read them.
    const withImage = this.vision && Boolean(req.imageBase64) && IMAGE_MIMES.has(req.imageMime ?? 'image/jpeg');
    const user: string | ChatCompletionContentPart[] = withImage
      ? [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: `data:${req.imageMime ?? 'image/jpeg'};base64,${req.imageBase64}` } },
        ]
      : text;
    const out = await completeJson(this.cfg, {
      system: this.prompt.system,
      user,
      schema: ScamAssessmentSchema,
      jsonSchema: SCAM_JSON_SCHEMA,
      fields: SCAM_FIELDS,
      maxTokens: withImage ? 1500 : 700,
      temperature: 0.1,
      model: withImage ? (this.cfg.visionModel ?? this.cfg.model) : this.cfg.model,
    });
    return out ? toLlmResult(out) : null;
  }
}
