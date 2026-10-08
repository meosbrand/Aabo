/**
 * @fileoverview Webhook authenticity checks, all constant-time.
 *  - Meta: X-Hub-Signature-256 = "sha256=" + hex HMAC-SHA256(app secret, raw body bytes)
 *  - Twilio: X-Twilio-Signature = base64 HMAC-SHA1(auth token, configured URL + sorted name+value pairs)
 *  - 360dialog / Meta verify token: sha256 of the shared secret compared with the stored hash
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function verifyMetaSignature(rawBody: Buffer, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const given = Buffer.from(header.slice(7), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return safeEqual(given, expected);
}

export function twilioSignature(url: string, params: URLSearchParams, authToken: string): string {
  const keys = [...new Set(params.keys())].sort();
  let data = url;
  for (const k of keys) for (const v of params.getAll(k)) data += k + v;
  return createHmac('sha1', authToken).update(data, 'utf8').digest('base64');
}

export function verifyTwilioSignature(url: string, params: URLSearchParams, header: string | null, authToken: string): boolean {
  if (!header) return false;
  return safeEqual(Buffer.from(header, 'utf8'), Buffer.from(twilioSignature(url, params, authToken), 'utf8'));
}

/** Compare a presented secret with a stored sha256 hex hash. */
export function matchesSecretHash(presented: string | null, storedHash: string | null): boolean {
  if (!presented || !storedHash) return false;
  return safeEqual(Buffer.from(sha256Hex(presented), 'hex'), Buffer.from(storedHash, 'hex'));
}
