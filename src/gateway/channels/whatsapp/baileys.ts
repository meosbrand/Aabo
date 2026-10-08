/**
 * Baileys v7 is ESM-only; load it lazily so the rest of the gateway (and tests) never need it.
 * Always the official @whiskeysockets/baileys package (a malicious look-alike fork exists:
 * OSV MAL-2026-16070).
 */
export type Baileys = typeof import('@whiskeysockets/baileys');

let cached: Promise<Baileys> | null = null;

export function loadBaileys(): Promise<Baileys> {
  cached ??= import('@whiskeysockets/baileys');
  return cached;
}
