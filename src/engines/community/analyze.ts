/**
 * @fileoverview Community engine pipeline: text, file and link signals, community reputation,
 * optional URL intel and an optional LLM second opinion. Simple and explainable on purpose.
 */

import { extract } from '@/core/extract';
import { contentHashOf, sha256 } from '@/core/hash';
import { LEVEL_MIN_SCORE, levelFromScore, maxLevel } from '@/core/levels';
import { actionsFor, summaryFor } from '@/core/advice';
import type { Category, EngineDeps, Extracted, IndicatorType, Level, LlmResult, ParsedUrl, Reason, ScanInput, Verdict } from '@/core/types';
import { parseUrl } from '@/core/extract';
import { isSharedPlatform, SHORTENERS } from '@/core/lists';
import { fileSignals, linkSignals, ocrUnavailable, reputationSignal, textSignals } from './signals';
import { trustedDomains } from './trusted';

const MAX_LINKS = 5;
const NEW_DOMAIN_DAYS = 30;

export interface CommunityOptions {
  confirmedAt: number;
}

/** Exact-duplicate fingerprint of a message (community engines match exact repeats only). */
export function exactFingerprint(x: Extracted): string | null {
  const words = x.text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\d+/g, '#')
    .replace(/[^\p{L}#\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return words.split(' ').length >= 6 ? `c1:${sha256(words).slice(0, 32)}` : null;
}

async function linkLayer(x: Extracted, deps: EngineDeps): Promise<{ reasons: Reason[]; trusted: string[]; resolved: ParsedUrl[] }> {
  const reasons: Reason[] = [];
  const trusted: string[] = [];
  const resolved: ParsedUrl[] = [];
  const intel = deps.urlIntel;
  for (const u of x.urls.slice(0, MAX_LINKS)) {
    const check = linkSignals(u);
    reasons.push(...check.reasons);
    if (check.trusted) {
      trusted.push(u.domain ?? u.hostname);
      continue;
    }
    if (!intel) continue;
    const targets = [u];
    if (SHORTENERS.has(u.domain ?? '')) {
      const finalUrl = await intel.unshorten(u.href).catch(() => null);
      const p = finalUrl ? parseUrl(finalUrl) : null;
      if (p && p.href !== u.href) {
        resolved.push(p);
        targets.push(p);
        reasons.push({ id: 'c.link_opens', weight: 0, source: 'url', text: { en: `The short link opens ${p.hostname}.`, pidgin: `The short link dey open ${p.hostname}.` } });
        const inner = linkSignals(p);
        reasons.push(...inner.reasons);
        if (inner.trusted) continue;
      }
    }
    for (const t of targets) {
      const hits = await intel.feeds(t.href).catch(() => []);
      if (hits.length) {
        const malware = hits.some((h) => /malware|unwanted/i.test(h.threat));
        reasons.push({
          id: 'c.feed_listed',
          weight: 0.9,
          source: 'feed',
          category: malware ? 'malware' : 'phishing',
          floor: 'DANGEROUS',
          text: {
            en: `${t.hostname} is listed as ${malware ? 'malware' : 'phishing'} by ${[...new Set(hits.map((h) => h.source))].join(', ')}.`,
            pidgin: `${t.hostname} dey listed as ${malware ? 'virus' : 'scam'} site by ${[...new Set(hits.map((h) => h.source))].join(', ')}.`,
          },
        });
      }
      const domain = t.domain;
      if (domain && !t.isIp && !SHORTENERS.has(domain)) {
        const created = await intel.domainCreated(domain).catch(() => null);
        if (created && Date.now() - created.getTime() < NEW_DOMAIN_DAYS * 86_400_000) {
          const days = Math.max(1, Math.round((Date.now() - created.getTime()) / 86_400_000));
          reasons.push({
            id: 'c.link_new',
            weight: 0.35,
            source: 'url',
            category: 'phishing',
            text: { en: `${domain} was registered only ${days} day(s) ago.`, pidgin: `Dem just register ${domain} ${days} day(s) ago.` },
          });
        }
      }
    }
  }
  return { reasons, trusted, resolved };
}

async function reputationLayer(x: Extracted, fingerprint: string | null, extraDomains: string[], deps: EngineDeps, opts: CommunityOptions): Promise<Reason[]> {
  const store = deps.reputation;
  if (!store) return [];
  const trusted = trustedDomains();
  // Official domains are never judged by reports; shared platforms only by exact URL.
  const urls = x.urls.slice(0, MAX_LINKS).filter((u) => !trusted.has(u.domain ?? u.hostname));
  const domains = [...new Set([...urls.map((u) => u.domain ?? u.hostname), ...extraDomains])].filter((d) => !trusted.has(d) && !isSharedPlatform(d));
  const checks: Array<[IndicatorType, string]> = [
    ...x.phones.map((v) => ['phone', v] as [IndicatorType, string]),
    ...x.accounts.map((v) => ['account', v] as [IndicatorType, string]),
    ...x.emails.map((v) => ['email', v] as [IndicatorType, string]),
    ...x.wallets.map((v) => ['wallet', v] as [IndicatorType, string]),
    ...urls.map((u) => ['url', u.href] as [IndicatorType, string]),
    ...domains.map((d) => ['domain', d] as [IndicatorType, string]),
  ];
  if (fingerprint) checks.push(['fingerprint', fingerprint]);
  const out: Reason[] = [];
  const seen = new Set<string>();
  for (const [type, value] of checks.slice(0, 20)) {
    const info = await store.lookup(type, value).catch(() => null);
    if (!info) continue;
    const r = reputationSignal(info, opts.confirmedAt);
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

async function deterministic(x: Extracted, input: ScanInput, fingerprint: string | null, deps: EngineDeps, opts: CommunityOptions) {
  const links = await linkLayer(x, deps);
  const reasons = [
    ...fileSignals(input),
    ...textSignals(x),
    ...links.reasons,
    ...(await reputationLayer(x, fingerprint, links.resolved.map((p) => p.domain ?? p.hostname), deps, opts)),
  ];
  return { reasons, trusted: links.trusted };
}

function scoreOf(reasons: Reason[]): { score: number; floor: Level } {
  let pos = 0;
  let neg = 0;
  let floor: Level = 'SAFE';
  for (const r of reasons) {
    if (r.weight > 0) pos += r.weight;
    else neg -= r.weight;
    if (r.floor && r.weight > 0) floor = maxLevel(floor, r.floor);
  }
  const score = Math.max(0, Math.min(100, Math.round(100 * pos - 50 * neg)));
  return { score: Math.max(score, LEVEL_MIN_SCORE[floor]), floor };
}

function categoryOf(reasons: Reason[]): Category | null {
  const best = reasons.filter((r) => r.weight > 0 && r.category && r.category !== 'other').sort((a, b) => b.weight - a.weight)[0];
  if (best?.category) return best.category;
  return reasons.some((r) => r.weight > 0) ? 'other' : null;
}

function wantsLlm(input: ScanInput, deps: EngineDeps, score: number, hasText: boolean): boolean {
  if (!deps.llm || deps.llmMode === 'never') return false;
  if (deps.llmMode === 'always') return true;
  if (input.imageBase64 && deps.llm.vision !== false) return true;
  if (!hasText) return false;
  if (input.channel === 'guardian' && input.conversation?.length && score < 60) return true;
  return score >= 10 && score < 60;
}

export async function analyzeCommunity(input: ScanInput, deps: EngineDeps, opts: CommunityOptions): Promise<Verdict> {
  const text = input.text ?? '';
  let x = extract({ text, url: input.url, phone: input.phone, account: input.account });
  let fingerprint = exactFingerprint(x);
  let det = await deterministic(x, input, fingerprint, deps, opts);
  let { score, floor } = scoreOf(det.reasons);

  let llm: LlmResult | null = null;
  let ocrText: string | undefined;
  if (wantsLlm(input, deps, score, Boolean(text.trim()))) {
    const sendImage = Boolean(input.imageBase64) && deps.llm!.vision !== false;
    llm = await deps
      .llm!.analyze({
        text: x.clean,
        context: input.context,
        conversation: input.conversation?.slice(-6),
        imageBase64: sendImage ? input.imageBase64 : undefined,
        imageMime: sendImage ? input.imageMime : undefined,
        signals: det.reasons.filter((r) => r.weight > 0).slice(0, 6).map((r) => r.text.en),
        ruleScore: score,
      })
      .catch(() => null);
    const read = llm?.extractedText?.trim();
    if (read) {
      ocrText = read.slice(0, 6000);
      x = extract({ text: [text, ocrText].filter(Boolean).join('\n'), url: input.url, phone: input.phone, account: input.account });
      fingerprint = exactFingerprint(x);
      det = await deterministic(x, input, fingerprint, deps, opts);
      ({ score, floor } = scoreOf(det.reasons));
    }
  }

  const reasons = [...det.reasons];
  if (input.imageBase64 && !text.trim() && !ocrText) reasons.push(ocrUnavailable());

  let category = categoryOf(reasons);
  if (llm) {
    const opinion = Math.max(0, Math.min(100, Math.round(llm.riskScore)));
    // The model moves the score towards its opinion: freely upwards, only a little downwards,
    // and never below a hard floor.
    score = opinion >= score ? Math.round(score + 0.6 * (opinion - score)) : Math.round(score - 0.3 * (score - opinion));
    score = Math.max(score, LEVEL_MIN_SCORE[floor]);
    reasons.push({
      id: 'llm.opinion',
      weight: opinion >= 50 ? 0.3 : opinion < 25 ? -0.1 : 0,
      source: 'llm',
      ...(llm.category ? { category: llm.category } : {}),
      text: { en: llm.explanationEn.slice(0, 400), pidgin: (llm.explanationPidgin || llm.explanationEn).slice(0, 400) },
    });
    if ((!category || category === 'other') && llm.category) category = llm.category;
  }

  const level = maxLevel(levelFromScore(score), floor);
  if (level === 'SAFE') category = null;
  const domains = [...new Set(x.urls.map((u) => u.domain ?? u.hostname))];
  return {
    level,
    score: Math.max(score, LEVEL_MIN_SCORE[level]),
    category,
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    actions: actionsFor(level, category),
    summary: summaryFor(level, category),
    indicators: {
      urls: x.urls.map((u) => u.href),
      domains,
      phones: x.phones,
      accounts: x.accounts,
      emails: x.emails,
      wallets: x.wallets,
      trustedDomains: domains.filter((d) => det.trusted.includes(d) || trustedDomains().has(d)),
    },
    usedLlm: Boolean(llm),
    fingerprint,
    contentHash: contentHashOf(input),
    ...(ocrText ? { ocrText } : {}),
  };
}
