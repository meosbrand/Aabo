/**
 * @fileoverview OpenAI SDK clients for any OpenAI-compatible endpoint.
 * Every option is explicit so stray OPENAI_* environment variables never redirect a request or
 * leak a key, and every request goes through the SSRF guard.
 */

import OpenAI from 'openai';
import { sha256 } from '@/core/hash';
import { assertSafeEndpoint, guardedFetch } from '../net/safe-fetch';
import type { AiConfig } from './config';

const clients = new Map<string, OpenAI>();
const MAX_CLIENTS = 200;

/** Header names the SDK would add from OPENAI_CUSTOM_HEADERS; we delete them (null) on every request. */
function envHeaderNames(): string[] {
  return (process.env.OPENAI_CUSTOM_HEADERS ?? '')
    .split('\n')
    .map((line) => (line.includes(':') ? line.slice(0, line.indexOf(':')).trim() : ''))
    .filter(Boolean);
}

export function clientFor(cfg: AiConfig): OpenAI {
  const envNames = envHeaderNames();
  const key = sha256([cfg.source, cfg.baseURL, cfg.apiKey, cfg.timeoutMs, cfg.allowPrivate, JSON.stringify(cfg.headers), envNames.join(',')].join('|'));
  let client = clients.get(key);
  if (!client) {
    client = new OpenAI({
      apiKey: cfg.apiKey || 'none',
      adminAPIKey: null,
      organization: null,
      project: null,
      webhookSecret: null,
      baseURL: cfg.baseURL,
      timeout: cfg.timeoutMs,
      maxRetries: 1,
      // Explicit headers win over anything the SDK reads from the environment.
      defaultHeaders: {
        ...Object.fromEntries(envNames.map((n) => [n, null])),
        ...cfg.headers,
        Authorization: `Bearer ${cfg.apiKey || 'none'}`,
      },
      logLevel: 'off',
      fetch: guardedFetch({ allowPrivate: cfg.allowPrivate, allowHeaders: Object.keys(cfg.headers) }),
    });
    if (clients.size >= MAX_CLIENTS) clients.clear();
    clients.set(key, client);
  }
  return client;
}

/** Refuse a blocked endpoint before the SDK spends retries on it. */
export async function ensureEndpoint(cfg: AiConfig): Promise<void> {
  if (!cfg.allowPrivate) await assertSafeEndpoint(cfg.baseURL);
}

/** Request fields shared by every call: token limit, temperature and provider extras. */
export function commonParams(cfg: AiConfig, maxTokens: number, temperature?: number): Record<string, unknown> {
  const out: Record<string, unknown> = { [cfg.tokenParam]: maxTokens };
  const t = cfg.temperature === 'default' ? temperature : cfg.temperature === 'omit' ? undefined : cfg.temperature;
  if (t !== undefined) out.temperature = t;
  return { ...out, ...(cfg.extraBody ?? {}) };
}
