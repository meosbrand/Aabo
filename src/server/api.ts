import { NextResponse } from 'next/server';
import { verifyApiKey } from './api-keys';
import { clientIpFrom, rateLimit } from './rate-limit';

const HOUR = 3_600_000;

/** Public API guard: API-key holders get a higher limit; anonymous callers are limited per IP. */
export async function apiGuard(req: Request, bucket: string, anonLimit: number, keyLimit = 2000) {
  const key = await verifyApiKey(req);
  const id = key ? `key:${key.id}` : `ip:${clientIpFrom(req)}`;
  const limit = await rateLimit(`api:${bucket}:${id}`, key ? keyLimit : anonLimit, HOUR);
  if (!limit.ok) {
    return {
      error: NextResponse.json(
        { error: 'rate_limited', resetAt: limit.resetAt.toISOString() },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)) } },
      ),
      key,
    };
  }
  return { error: null, key };
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: 'bad_request', message, details }, { status: 400 });
}
