/**
 * @fileoverview Structured (JSON) answers from any OpenAI-compatible model.
 *
 * Providers differ: some support strict JSON Schema, some only "JSON object" mode, some neither.
 * We start with the configured mode and, if the provider rejects `response_format`, step down
 * (json_schema → json_object → prompt), retry once and remember that for an hour.
 */

import OpenAI from 'openai';
import type { ChatCompletionContentPart, ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ZodType, ZodTypeDef } from 'zod';
import type { JsonMode } from '@/lib/ai-presets';
import { logError } from '../log';
import { clientFor, commonParams, ensureEndpoint } from './client';
import type { AiConfig } from './config';

export interface JsonRequest<T> {
  system: string;
  user: string | ChatCompletionContentPart[];
  schema: ZodType<T, ZodTypeDef, unknown>;
  jsonSchema: { name: string; schema: Record<string, unknown> };
  /** Plain description of the expected keys (used when the provider cannot enforce a schema). */
  fields: string;
  maxTokens: number;
  temperature?: number;
  model?: string;
}

export interface JsonResult<T> {
  data: T | null;
  mode: JsonMode;
}

const DOWNGRADE_TTL_MS = 3_600_000;
const downgrades = new Map<string, { mode: JsonMode; until: number }>();
const NEXT: Record<JsonMode, JsonMode | null> = { json_schema: 'json_object', json_object: 'prompt', prompt: null };
const ORDER: JsonMode[] = ['json_schema', 'json_object', 'prompt'];

function modeFor(cfg: AiConfig, model: string): JsonMode {
  const d = downgrades.get(`${cfg.baseURL}|${model}`);
  if (d && d.until > Date.now() && ORDER.indexOf(d.mode) > ORDER.indexOf(cfg.jsonMode)) return d.mode;
  return cfg.jsonMode;
}

function jsonInstructions(mode: JsonMode, fields: string): string {
  if (mode === 'json_schema') return '\n\nAnswer in JSON.';
  return `\n\nAnswer with one JSON object only (no prose, no code fences) with exactly these keys: ${fields}`;
}

/** Extract the first JSON object from a model reply (tolerates code fences and prose). */
export function extractJson(content: string): unknown {
  const text = content.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function rejectsFormat(err: unknown): boolean {
  return err instanceof OpenAI.BadRequestError && /response_format|json_schema|json_object|structured output|schema/i.test(err.message);
}

/** Like completeJson, but throws provider/network errors (used by the connection test). */
export async function completeJsonOrThrow<T>(cfg: AiConfig, req: JsonRequest<T>): Promise<JsonResult<T>> {
  const model = req.model ?? cfg.model;
  await ensureEndpoint(cfg);
  let mode = modeFor(cfg, model);
  for (;;) {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: req.system + jsonInstructions(mode, req.fields) },
      { role: 'user', content: req.user },
    ];
    const body = {
      model,
      messages,
      ...(mode === 'json_schema'
        ? { response_format: { type: 'json_schema', json_schema: { name: req.jsonSchema.name, strict: true, schema: req.jsonSchema.schema } } }
        : mode === 'json_object'
          ? { response_format: { type: 'json_object' } }
          : {}),
      ...commonParams(cfg, req.maxTokens, req.temperature),
    } as unknown as ChatCompletionCreateParamsNonStreaming;
    try {
      const res = await clientFor(cfg).chat.completions.create(body);
      const choice = res.choices?.[0];
      if (!choice || choice.message?.refusal || choice.finish_reason === 'length' || typeof choice.message?.content !== 'string') {
        return { data: null, mode };
      }
      const parsed = req.schema.safeParse(extractJson(choice.message.content));
      return { data: parsed.success ? parsed.data : null, mode };
    } catch (err) {
      const next = NEXT[mode];
      if (next && rejectsFormat(err)) {
        downgrades.set(`${cfg.baseURL}|${model}`, { mode: next, until: Date.now() + DOWNGRADE_TTL_MS });
        mode = next;
        continue;
      }
      throw err;
    }
  }
}

/** Ask for a JSON answer validated by `schema`. Never throws: any failure returns null. */
export async function completeJson<T>(cfg: AiConfig, req: JsonRequest<T>): Promise<T | null> {
  try {
    return (await completeJsonOrThrow(cfg, req)).data;
  } catch (err) {
    logError(`AI request to ${cfg.provider} failed`, err);
    return null;
  }
}

/** Plain-text chat completion (Co-pilot). Throws provider/network errors. */
export async function completeText(cfg: AiConfig, messages: ChatCompletionMessageParam[], opts: { maxTokens: number; temperature?: number }): Promise<string | null> {
  await ensureEndpoint(cfg);
  const body = { model: cfg.model, messages, ...commonParams(cfg, opts.maxTokens, opts.temperature) } as unknown as ChatCompletionCreateParamsNonStreaming;
  const res = await clientFor(cfg).chat.completions.create(body);
  const choice = res.choices?.[0];
  if (!choice || choice.message?.refusal) return null;
  return typeof choice.message?.content === 'string' ? choice.message.content : null;
}

/** Tests only. */
export function __resetJsonDowngrades(): void {
  downgrades.clear();
}
