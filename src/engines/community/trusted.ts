/**
 * @fileoverview A short list of well-known official domains. Links to these are treated as
 * legitimate and are never reported as scams. Operators can extend it with AABO_TRUSTED_DOMAINS
 * (comma-separated registrable domains).
 */

const BUILT_IN = [
  // Banks and payment companies
  'gtbank.com',
  'firstbanknigeria.com',
  'zenithbank.com',
  'accessbankplc.com',
  'ubagroup.com',
  'fidelitybank.ng',
  'unionbankng.com',
  'sterling.ng',
  'wemabank.com',
  'fcmb.com',
  'stanbicibtcbank.com',
  'opayweb.com',
  'palmpay.com',
  'moniepoint.com',
  'kudabank.com',
  'paystack.com',
  'flutterwave.com',
  'remita.net',
  // Government
  'cbn.gov.ng',
  'nimc.gov.ng',
  'efcc.gov.ng',
  'firs.gov.ng',
  'jamb.gov.ng',
  // Telecoms and platforms
  'mtn.ng',
  'airtel.com.ng',
  'gloworld.com',
  '9mobile.com.ng',
  'whatsapp.com',
  'google.com',
  'apple.com',
  'microsoft.com',
];

let cache: { env: string; set: Set<string> } | null = null;

export function trustedDomains(): Set<string> {
  const env = process.env.AABO_TRUSTED_DOMAINS ?? '';
  if (!cache || cache.env !== env) {
    const extra = env
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    cache = { env, set: new Set([...BUILT_IN, ...extra]) };
  }
  return cache.set;
}

/** Distinctive name part of each trusted domain ("gtbank", "moniepoint"), for look-alike checks. */
export function trustedNames(): string[] {
  return [...trustedDomains()].map((d) => d.split('.')[0]).filter((n) => n.length >= 5 && !['google', 'apple'].includes(n));
}
