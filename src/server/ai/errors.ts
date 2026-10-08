/**
 * @fileoverview Turn provider and network errors into short, safe codes for the UI and logs.
 */

import OpenAI from 'openai';
import { BlockedAddressError, ResponseTooLargeError } from '../net/safe-fetch';

export type AiErrorCode = 'auth_failed' | 'model_not_found' | 'unreachable' | 'blocked_address' | 'bad_response' | 'timeout' | 'rate_limited';

function causes(err: unknown): unknown[] {
  const out: unknown[] = [];
  let e: unknown = err;
  for (let i = 0; e && i < 6; i++) {
    out.push(e);
    e = (e as { cause?: unknown }).cause;
  }
  return out;
}

export function classifyAiError(err: unknown): AiErrorCode {
  const chain = causes(err);
  if (chain.some((e) => e instanceof BlockedAddressError || (e as { code?: string })?.code === 'blocked_address')) return 'blocked_address';
  if (chain.some((e) => e instanceof ResponseTooLargeError)) return 'bad_response';
  if (err instanceof OpenAI.APIConnectionTimeoutError) return 'timeout';
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) return 'auth_failed';
  if (err instanceof OpenAI.NotFoundError) return 'model_not_found';
  if (err instanceof OpenAI.RateLimitError) return 'rate_limited';
  if (err instanceof OpenAI.BadRequestError) return /model/i.test(err.message) ? 'model_not_found' : 'bad_response';
  if (err instanceof OpenAI.APIConnectionError) return 'unreachable';
  if (err instanceof OpenAI.APIError) return (err.status ?? 0) >= 500 ? 'unreachable' : 'bad_response';
  if (chain.some((e) => (e as Error)?.name === 'TimeoutError' || (e as Error)?.name === 'AbortError')) return 'timeout';
  return 'unreachable';
}
