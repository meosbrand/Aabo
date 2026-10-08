/**
 * @fileoverview "Test connection" for an AI provider: checks the key, model and JSON support with a
 * tiny request, then (if vision is on) whether the model accepts an image.
 */

import { z } from 'zod';
import type { JsonMode } from '@/lib/ai-presets';
import type { AiConfig } from './config';
import { classifyAiError, type AiErrorCode } from './errors';
import { completeJsonOrThrow } from './json';

export type AiTestCode = 'ok' | AiErrorCode;

export interface AiTestResult {
  ok: boolean;
  code: AiTestCode;
  latencyMs: number;
  model: string;
  /** JSON mode that worked (after any automatic downgrade). */
  jsonMode: JsonMode | null;
  /** Whether an image request worked; null when vision is off or the text test failed. */
  vision: boolean | null;
}

/** 1×1 transparent PNG. */
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const Ping = z.object({ ok: z.union([z.boolean(), z.literal('true')]) });
const PING_SCHEMA = { name: 'ping', schema: { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } } };

export async function testAiConnection(cfg: AiConfig): Promise<AiTestResult> {
  const started = Date.now();
  const base = { model: cfg.model, jsonMode: null, vision: null };
  try {
    const res = await completeJsonOrThrow(cfg, {
      system: 'You are a connectivity check.',
      user: 'Reply with {"ok": true}.',
      schema: Ping,
      jsonSchema: PING_SCHEMA,
      fields: 'ok (boolean, true)',
      maxTokens: 50,
      temperature: 0,
    });
    if (!res.data) return { ...base, ok: false, code: 'bad_response', latencyMs: Date.now() - started, jsonMode: res.mode };
    let vision: boolean | null = null;
    if (cfg.vision) {
      try {
        const img = await completeJsonOrThrow(cfg, {
          system: 'You are a connectivity check.',
          user: [
            { type: 'text', text: 'Reply with {"ok": true} if you can see the image.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${PIXEL}` } },
          ],
          schema: Ping,
          jsonSchema: PING_SCHEMA,
          fields: 'ok (boolean, true)',
          maxTokens: 50,
          temperature: 0,
          model: cfg.visionModel ?? cfg.model,
        });
        vision = Boolean(img.data);
      } catch {
        vision = false;
      }
    }
    return { ...base, ok: true, code: 'ok', latencyMs: Date.now() - started, jsonMode: res.mode, vision };
  } catch (err) {
    return { ...base, ok: false, code: classifyAiError(err), latencyMs: Date.now() - started };
  }
}
