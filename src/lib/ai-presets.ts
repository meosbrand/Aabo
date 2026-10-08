/**
 * @fileoverview OpenAI-compatible provider presets. Pure data: safe to import from client
 * components (the Developer settings form uses it to pre-fill fields).
 * Model ids are only suggestions; the "Test connection" button is the source of truth.
 */

export type AiProviderId =
  | 'openai'
  | 'openrouter'
  | 'groq'
  | 'together'
  | 'deepseek'
  | 'gemini'
  | 'azure'
  | 'ollama'
  | 'lmstudio'
  | 'vllm'
  | 'custom';

export type JsonMode = 'json_schema' | 'json_object' | 'prompt';

export interface AiPreset {
  id: AiProviderId;
  label: string;
  /** Default base URL (empty: the user must enter one). */
  baseURL: string;
  /** Suggested model id. */
  model: string;
  jsonMode: JsonMode;
  vision: boolean;
  tokenParam: 'max_completion_tokens' | 'max_tokens';
  /** Whether the provider rejects or ignores `temperature` for its default models. */
  omitTemperature?: boolean;
  /** Runs on the operator's own network (BYOK needs AI_ALLOW_PRIVATE_ENDPOINTS=1). */
  local?: boolean;
  keyRequired: boolean;
  /** Extra request headers (ASCII only). */
  headers?: Record<string, string>;
  /** Extra JSON body fields sent with every request. */
  extraBody?: Record<string, unknown>;
  /** Allowed hostname suffixes for the base URL, when the provider has fixed hosts. */
  hostSuffixes?: string[];
  docsUrl?: string;
}

export const AI_PRESETS: Record<AiProviderId, AiPreset> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-5.4-mini',
    jsonMode: 'json_schema',
    vision: true,
    tokenParam: 'max_completion_tokens',
    omitTemperature: true,
    keyRequired: true,
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-5.4-mini',
    jsonMode: 'json_schema',
    vision: true,
    tokenParam: 'max_tokens',
    keyRequired: true,
    headers: { 'HTTP-Referer': 'https://github.com/meosbrand/Aabo', 'X-Title': 'Aabo' },
    extraBody: { provider: { require_parameters: true } },
    docsUrl: 'https://openrouter.ai/keys',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    jsonMode: 'json_object',
    vision: false,
    tokenParam: 'max_tokens',
    keyRequired: true,
    docsUrl: 'https://console.groq.com/keys',
  },
  together: {
    id: 'together',
    label: 'Together AI',
    baseURL: 'https://api.together.ai/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    jsonMode: 'json_object',
    vision: false,
    tokenParam: 'max_tokens',
    keyRequired: true,
    docsUrl: 'https://api.together.ai/settings/api-keys',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    jsonMode: 'json_object',
    vision: false,
    tokenParam: 'max_tokens',
    keyRequired: true,
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini (OpenAI-compatible endpoint)',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
    jsonMode: 'json_object',
    vision: true,
    tokenParam: 'max_tokens',
    keyRequired: true,
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  azure: {
    id: 'azure',
    label: 'Azure OpenAI',
    baseURL: '',
    model: '',
    jsonMode: 'json_schema',
    vision: true,
    tokenParam: 'max_completion_tokens',
    omitTemperature: true,
    keyRequired: true,
    hostSuffixes: ['.openai.azure.com', '.services.ai.azure.com'],
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    baseURL: 'http://localhost:11434/v1',
    model: 'llama3.1',
    jsonMode: 'json_object',
    vision: false,
    tokenParam: 'max_tokens',
    local: true,
    keyRequired: false,
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseURL: 'http://localhost:1234/v1',
    model: '',
    jsonMode: 'json_schema',
    vision: false,
    tokenParam: 'max_tokens',
    local: true,
    keyRequired: false,
  },
  vllm: {
    id: 'vllm',
    label: 'vLLM (self-hosted)',
    baseURL: 'http://localhost:8000/v1',
    model: '',
    jsonMode: 'json_schema',
    vision: false,
    tokenParam: 'max_tokens',
    local: true,
    keyRequired: false,
  },
  custom: {
    id: 'custom',
    label: 'Other OpenAI-compatible API',
    baseURL: '',
    model: '',
    jsonMode: 'prompt',
    vision: false,
    tokenParam: 'max_tokens',
    keyRequired: false,
  },
};

export function isAiProviderId(x: unknown): x is AiProviderId {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(AI_PRESETS, x);
}
