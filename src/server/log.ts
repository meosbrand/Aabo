/**
 * @fileoverview Error logging that never prints credentials. Use for anything that might include
 * a provider error message, a URL with a key, or a request header.
 */

const PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]'],
  [/\bsk-[A-Za-z0-9_-]{6,}/g, 'sk-[redacted]'],
  [/\bAIza[0-9A-Za-z_-]{10,}/g, 'AIza[redacted]'],
  [/\bEAA[0-9A-Za-z]{10,}/g, 'EAA[redacted]'],
  [/\bgsk_[A-Za-z0-9]{10,}/g, 'gsk_[redacted]'],
  [/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s]+/gi, '$1[redacted]'],
  [/("?(?:api[-_]?key|authorization|password|secret|token)"?\s*[:=]\s*"?)[^"\s,}]+/gi, '$1[redacted]'],
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const [re, sub] of PATTERNS) out = out.replace(re, sub);
  return out;
}

export function logError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(`[aabo] ${scope}: ${redactSecrets(msg).slice(0, 500)}`);
}
