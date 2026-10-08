/**
 * @fileoverview Sealing customer secrets (API keys, access tokens) at rest.
 *
 * AES-256-GCM with a random 12-byte IV. Sealed form: `v1.<kid>.<iv>.<tag>.<ciphertext>` (base64url).
 * Keys come from AABO_SECRET_KEYS="k2:<base64 32 bytes>,k1:<...>": the first key seals new
 * secrets, any listed key can open. Additional authenticated data (AAD) binds each secret to the
 * row it belongs to, so a sealed value copied to another organisation will not open.
 * Without keys, nothing can be sealed (Developer Mode stays off).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class SecretsUnavailableError extends Error {
  constructor() {
    super('AABO_SECRET_KEYS is not configured');
    this.name = 'SecretsUnavailableError';
  }
}

export class SecretOpenError extends Error {
  constructor(reason: string) {
    super(`cannot open secret: ${reason}`);
    this.name = 'SecretOpenError';
  }
}

interface Key {
  kid: string;
  key: Buffer;
}

let cache: { env: string; keys: Key[] } | null = null;

/** Parsed keyring (first = current). Invalid entries are ignored with a warning. */
export function keyring(): Key[] {
  const env = process.env.AABO_SECRET_KEYS ?? '';
  if (cache?.env === env) return cache.keys;
  const keys: Key[] = [];
  for (const part of env.split(',').map((p) => p.trim()).filter(Boolean)) {
    const i = part.indexOf(':');
    const kid = i > 0 ? part.slice(0, i) : '';
    const key = Buffer.from(i > 0 ? part.slice(i + 1) : '', 'base64');
    if (!/^[A-Za-z0-9_-]{1,16}$/.test(kid) || key.length !== 32) {
      console.error('[aabo] ignoring an invalid AABO_SECRET_KEYS entry (expected "<id>:<base64 of 32 bytes>")');
      continue;
    }
    if (!keys.some((k) => k.kid === kid)) keys.push({ kid, key });
  }
  cache = { env, keys };
  return keys;
}

export function secretsAvailable(): boolean {
  return keyring().length > 0;
}

const b64u = (b: Buffer) => b.toString('base64url');

export function seal(plain: string, aad: string): string {
  const [current] = keyring();
  if (!current) throw new SecretsUnavailableError();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', current.key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', current.kid, b64u(iv), b64u(cipher.getAuthTag()), b64u(ct)].join('.');
}

export function open(sealed: string, aad: string): string {
  const parts = sealed.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1') throw new SecretOpenError('unknown format');
  const [, kid, iv, tag, ct] = parts;
  const k = keyring().find((x) => x.kid === kid);
  if (!k) throw new SecretOpenError(`key "${kid}" is not in AABO_SECRET_KEYS`);
  try {
    const decipher = createDecipheriv('aes-256-gcm', k.key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new SecretOpenError('authentication failed');
  }
}

/** Key id a sealed value was sealed with. */
export function sealedKid(sealed: string): string | null {
  const parts = sealed.split('.');
  return parts.length === 5 && parts[0] === 'v1' ? parts[1] : null;
}

/** True when the value is sealed with an older key and should be re-sealed. */
export function needsReseal(sealed: string): boolean {
  const [current] = keyring();
  return Boolean(current) && sealedKid(sealed) !== current.kid;
}

/** What the UI may show about a secret: its last four characters. */
export function hintOf(secret: string): string {
  const s = secret.trim();
  return s.length >= 12 ? `…${s.slice(-4)}` : '…';
}

/** AAD for an organisation integration secret. */
export const integrationAad = (orgId: string, kind: string) => `aabo:int:${orgId}:${kind}`;
/** AAD for a WhatsApp connection secret. */
export const connectionAad = (orgId: string, connectionId: string) => `aabo:conn:${orgId}:${connectionId}`;
