/**
 * @fileoverview Which OpenAI-compatible endpoint a scan or Co-pilot answer uses.
 *
 * Platform AI comes from AI_* environment variables (set by the operator). Organisations can bring
 * their own key in Developer Mode; a BYOK organisation never falls back to the platform key.
 * Without any configuration Ààbò runs on rules, reputation and threat feeds alone.
 */

import { AI_PRESETS, isAiProviderId, type AiProviderId, type JsonMode } from '@/lib/ai-presets';

export type AiSource = 'platform' | 'byok';

export interface AiConfig {
  source: AiSource;
  provider: AiProviderId;
  baseURL: string;
  apiKey: string;
  model: string;
  visionModel: string | null;
  vision: boolean;
  jsonMode: JsonMode;
  /** A fixed temperature, 'omit' to never send one, or 'default' for the per-call value. */
  temperature: number | 'omit' | 'default';
  timeoutMs: number;
  tokenParam: 'max_completion_tokens' | 'max_tokens';
  headers: Record<string, string>;
  extraBody: Record<string, unknown> | null;
  /** May call loopback/private addresses (operator-configured endpoints only, unless allowed). */
  allowPrivate: boolean;
  /** Organisation the call is made for (quota and logging). */
  orgId: string | null;
}

/** Settings as entered by an operator (env) or an organisation admin (Developer Mode). */
export interface AiSettings {
  provider?: string | null;
  baseURL?: string | null;
  apiKey?: string | null;
  model?: string | null;
  visionModel?: string | null;
  vision?: boolean | string | null;
  jsonMode?: string | null;
  temperature?: number | string | null;
  timeoutMs?: number | string | null;
}

export class AiConfigError extends Error {
  constructor(
    readonly code: 'missing_base_url' | 'invalid_base_url' | 'missing_model' | 'missing_key' | 'host_not_allowed',
    message: string,
  ) {
    super(message);
    this.name = 'AiConfigError';
  }
}

const JSON_MODES: JsonMode[] = ['json_schema', 'json_object', 'prompt'];

function bool(v: AiSettings['vision'], fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return fallback;
}

function asciiOnly(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) if (/^[\x20-\x7e]*$/.test(k) && /^[\x20-\x7e]*$/.test(v)) out[k] = v;
  return out;
}

/** Validate settings and fill in preset defaults. Throws AiConfigError. */
export function buildAiConfig(settings: AiSettings, source: AiSource, orgId: string | null = null): AiConfig {
  const provider: AiProviderId = isAiProviderId(settings.provider) ? settings.provider : 'custom';
  const preset = AI_PRESETS[provider];
  const baseURL = (settings.baseURL?.trim() || preset.baseURL).replace(/\s/g, '');
  if (!baseURL) throw new AiConfigError('missing_base_url', 'Enter the API base URL.');
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new AiConfigError('invalid_base_url', 'The base URL is not a valid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new AiConfigError('invalid_base_url', 'The base URL must start with https://');
  if (preset.hostSuffixes && !preset.hostSuffixes.some((s) => parsed.hostname.toLowerCase().endsWith(s))) {
    throw new AiConfigError('host_not_allowed', `The ${preset.label} URL must end with ${preset.hostSuffixes.join(' or ')}.`);
  }
  const model = settings.model?.trim() || preset.model;
  if (!model) throw new AiConfigError('missing_model', 'Enter a model name.');
  const apiKey = settings.apiKey?.trim() ?? '';
  if (preset.keyRequired && !apiKey) throw new AiConfigError('missing_key', `${preset.label} needs an API key.`);

  let temperature: AiConfig['temperature'] = preset.omitTemperature ? 'omit' : 'default';
  const t = settings.temperature;
  if (t === 'none' || t === 'omit') temperature = 'omit';
  else if (t !== undefined && t !== null && t !== '' && Number.isFinite(Number(t))) temperature = Math.max(0, Math.min(2, Number(t)));

  const timeout = Number(settings.timeoutMs);
  const headers = asciiOnly({ ...(preset.headers ?? {}), ...(provider === 'azure' && apiKey ? { 'api-key': apiKey } : {}) });
  return {
    source,
    provider,
    baseURL,
    apiKey,
    model,
    visionModel: settings.visionModel?.trim() || null,
    vision: bool(settings.vision, preset.vision),
    jsonMode: JSON_MODES.includes(settings.jsonMode as JsonMode) ? (settings.jsonMode as JsonMode) : preset.jsonMode,
    temperature,
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? Math.min(timeout, 120_000) : 20_000,
    tokenParam: preset.tokenParam,
    headers,
    extraBody: preset.extraBody ?? null,
    allowPrivate: source === 'platform' || process.env.AI_ALLOW_PRIVATE_ENDPOINTS === '1',
    orgId,
  };
}

let platformCache: { sig: string; cfg: AiConfig | null } | null = null;

/** The operator's AI configuration from AI_* variables, or null when none is set. */
export function platformAiConfig(): AiConfig | null {
  const env = process.env;
  const sig = [env.AI_PROVIDER, env.AI_BASE_URL, env.AI_API_KEY, env.AI_MODEL, env.AI_VISION_MODEL, env.AI_VISION, env.AI_JSON_MODE, env.AI_TEMPERATURE, env.AI_TIMEOUT_MS].join('\u0000');
  if (platformCache?.sig === sig) return platformCache.cfg;
  let cfg: AiConfig | null = null;
  if (env.AI_PROVIDER || env.AI_BASE_URL || env.AI_API_KEY) {
    try {
      cfg = buildAiConfig(
        {
          provider: env.AI_PROVIDER || (env.AI_BASE_URL ? 'custom' : 'openai'),
          baseURL: env.AI_BASE_URL,
          apiKey: env.AI_API_KEY,
          model: env.AI_MODEL,
          visionModel: env.AI_VISION_MODEL,
          vision: env.AI_VISION,
          jsonMode: env.AI_JSON_MODE,
          temperature: env.AI_TEMPERATURE,
          timeoutMs: env.AI_TIMEOUT_MS,
        },
        'platform',
      );
    } catch (err) {
      console.error(`[aabo] AI is disabled: ${(err as Error).message}`);
    }
  }
  platformCache = { sig, cfg };
  return cfg;
}

/** The AI configuration for a scan or answer made on behalf of `orgId` (null: rules only). */
export async function resolveAiConfig(orgId?: string | null): Promise<AiConfig | null> {
  const platform = platformAiConfig();
  return platform ? { ...platform, orgId: orgId ?? null } : null;
}

/** Forget cached configuration for an organisation (after its settings change). */
export function invalidateAiConfig(_orgId?: string | null): void {
  platformCache = null;
}
