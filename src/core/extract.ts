/**
 * @fileoverview Normalization and indicator extraction.
 * Scammers hide links and keywords with zero-width characters, look-alike Unicode,
 * "hxxp" / "[.]" defanging and leetspeak. Everything is undone here before the
 * rules run, so rules can stay simple.
 */

import { parse as parseDomain } from 'tldts';
import type { Extracted, ParsedUrl } from './types';

const ZERO_WIDTH = /[​-‏‪-‮⁠-⁤﻿­]/g;

/** Common Cyrillic/Greek/Armenian look-alikes folded to Latin. */
const HOMOGLYPHS: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i', ј: 'j', ԁ: 'd', ɡ: 'g', һ: 'h',
  ո: 'n', ս: 'u', ѕ: 's', ԛ: 'q', ԝ: 'w', ɑ: 'a', ο: 'o', ν: 'v', τ: 't', ι: 'i', κ: 'k', ρ: 'p',
  А: 'a', В: 'b', Е: 'e', К: 'k', М: 'm', Н: 'h', О: 'o', Р: 'p', С: 'c', Т: 't', Х: 'x', У: 'y',
  Α: 'a', Β: 'b', Ε: 'e', Ζ: 'z', Η: 'h', Ι: 'i', Κ: 'k', Μ: 'm', Ν: 'n', Ο: 'o', Ρ: 'p', Τ: 't', Υ: 'y', Χ: 'x',
};
const HOMOGLYPH_RE = new RegExp(`[${Object.keys(HOMOGLYPHS).join('')}]`, 'g');

/** Leetspeak digits/symbols inside words: "fr33" -> "free", "b1tcoin" -> "bitcoin". */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '$': 's', '@': 'a', '7': 't' };

/** Undo defanging: hxxp, [.], (.), {.}, " dot ". */
export function refang(s: string): string {
  return s
    .replace(/h(?:xx|\*\*|XX)p(s?):\/\//gi, 'http$1://')
    .replace(/\s*[[({]\s*(?:\.|dot)\s*[\])}]\s*/gi, '.')
    .replace(/(\w)\s+dot\s+(com|ng|org|net|xyz|top|info|online|site|link|me|co|io|app)\b/gi, '$1.$2');
}

/** Clean text for display/fingerprinting: NFKC + zero-width removal + refang. */
export function cleanText(input: string): string {
  return refang(input.normalize('NFKC').replace(ZERO_WIDTH, '')).replace(/\r\n?/g, '\n').trim();
}

/** Text used by the keyword rules: clean + homoglyph/leet folding + lower case + squashed spaces. */
export function foldForRules(clean: string): string {
  return clean
    .replace(HOMOGLYPH_RE, (c) => HOMOGLYPHS[c] ?? c)
    .toLowerCase()
    .replace(/(?<=[a-z])[0134$5@7](?=[a-z])/g, (c) => LEET[c] ?? c)
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[ \t]+/g, ' ');
}

const URL_CANDIDATE =
  /(?<![@\w.-])((?:https?:\/\/)?(?:[a-z0-9¡-￿](?:[a-z0-9¡-￿-]{0,62}[a-z0-9¡-￿])?\.)+[a-z¡-￿]{2,24}(?::\d{2,5})?(?:[/?#][^\s<>"')\]]*)?|https?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d{2,5})?(?:[/?#][^\s<>"')\]]*)?)/gi;

/** Words that look like domains but almost never are, in chat text. */
const NOT_DOMAINS = new Set(['e.g', 'i.e', 'a.m', 'p.m', 'u.s', 'u.k', 'n.b']);

/** Parse a URL-ish string. Returns null if it isn't a real, ICANN-suffixed host. */
export function parseUrl(raw: string): ParsedUrl | null {
  let candidate = raw.replace(/[.,;:!?]+$/, '');
  if (NOT_DOMAINS.has(candidate.toLowerCase())) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `http://${candidate}`;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }
  const hostname = u.hostname.toLowerCase().replace(/\.$/, '');
  const info = parseDomain(hostname, { allowPrivateDomains: false });
  if (info.isIp) {
    return { raw, href: u.href, hostname, domain: null, subdomain: null, publicSuffix: null, isIp: true };
  }
  if (!info.domain || !info.isIcann) return null;
  // Bare words like "file.txt" or "index.html": require a scheme or a plausible TLD.
  if (!/^https?:\/\//i.test(raw) && /^(txt|html?|php|jpg|jpeg|png|pdf|docx?|xlsx?|zip|apk|js|css)$/i.test(info.publicSuffix ?? '')) {
    return null;
  }
  return {
    raw,
    href: u.href,
    hostname,
    domain: info.domain,
    subdomain: info.subdomain || null,
    publicSuffix: info.publicSuffix,
    isIp: false,
  };
}

/** Normalize a Nigerian (or international) phone number to E.164. Returns null if not a phone. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const plain = digits.replace(/^\+/, '');
  // Nigerian mobile: 0[789][01]XXXXXXXX or 234[789][01]XXXXXXXX
  let m = plain.match(/^0([789][01]\d{8})$/);
  if (m) return `+234${m[1]}`;
  m = plain.match(/^234([789][01]\d{8})$/);
  if (m) return `+234${m[1]}`;
  m = plain.match(/^234(0[789][01]\d{8})$/); // "+234 0803..." written with the trunk zero
  if (m) return `+234${m[1].slice(1)}`;
  if (digits.startsWith('+') && plain.length >= 8 && plain.length <= 15) return `+${plain}`;
  return null;
}

const PHONE_CANDIDATE = /(?:\+?234[\s-]?|\b0)[789][01](?:[\s-]?\d){8}\b|\+\d[\d\s-]{7,16}\d/g;
const ACCOUNT_CANDIDATE = /(?<![\d+])\d{10}(?!\d)/g;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const WALLET = /\b(?:bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40}|T[1-9A-HJ-NP-Za-km-z]{33})\b/g;
const SIX_DIGIT_CODE = /(?<!\d)\d{3}[- ]?\d{3}(?!\d)/g;
const AMOUNT =
  /(?:₦|\bngn\s?|\bn(?=\d))\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(k|m|million|thousand)?|\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(k|m|million|thousand)?\s*(?:naira|ngn)\b|\b(\d+(?:\.\d+)?)(k)\b/gi;

function multiplier(unit?: string): number {
  if (!unit) return 1;
  const u = unit.toLowerCase();
  if (u === 'k' || u === 'thousand') return 1_000;
  if (u === 'm' || u === 'million') return 1_000_000;
  return 1;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Extract every indicator from free text plus explicit fields. */
export function extract(input: { text?: string; url?: string; phone?: string; account?: string }): Extracted {
  const parts = [input.text, input.url, input.phone, input.account].filter(Boolean) as string[];
  const clean = cleanText(parts.join('\n'));
  const text = foldForRules(clean);

  const emails = unique((clean.match(EMAIL) ?? []).map((e) => e.toLowerCase()));
  const withoutEmails = clean.replace(EMAIL, ' ');

  const urls: ParsedUrl[] = [];
  const seen = new Set<string>();
  for (const m of withoutEmails.matchAll(URL_CANDIDATE)) {
    const parsed = parseUrl(m[1]);
    if (parsed && !seen.has(parsed.href)) {
      seen.add(parsed.href);
      urls.push(parsed);
    }
  }

  const phoneMatches = clean.match(PHONE_CANDIDATE) ?? [];
  const phones = unique(phoneMatches.map(normalizePhone).filter((p): p is string => Boolean(p)));
  if (input.phone) {
    const p = normalizePhone(input.phone);
    if (p && !phones.includes(p)) phones.push(p);
  }

  // Account numbers: 10-digit runs that are not part of a phone number.
  const phoneDigitRuns = new Set(phoneMatches.map((p) => p.replace(/\D/g, '')));
  const accounts = unique(
    (withoutEmails.match(ACCOUNT_CANDIDATE) ?? []).filter((a) => ![...phoneDigitRuns].some((p) => p.includes(a))),
  );
  if (input.account && /^\d{10}$/.test(input.account.trim()) && !accounts.includes(input.account.trim())) {
    accounts.push(input.account.trim());
  }

  const amounts: number[] = [];
  for (const m of clean.matchAll(AMOUNT)) {
    const num = m[1] ?? m[3] ?? m[5];
    const unit = m[2] ?? m[4] ?? m[6];
    if (!num) continue;
    const value = parseFloat(num.replace(/,/g, '')) * multiplier(unit);
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }

  const wallets = unique(clean.match(WALLET) ?? []).filter((w) => !/^\d+$/.test(w));
  const codes = unique((clean.match(SIX_DIGIT_CODE) ?? []).map((c) => c.replace(/\D/g, ''))).filter(
    (c) => !accounts.some((a) => a.includes(c)) && !phones.some((p) => p.includes(c)),
  );

  return { text, clean, urls, phones, accounts, amounts: unique(amounts), emails, wallets, codes };
}
