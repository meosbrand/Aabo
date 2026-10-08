import { describe, expect, it } from 'vitest';
import { contentHashOf } from './hash';
import { extract, normalizePhone, refang } from './extract';
import { verdictToChat, warningMessage, whatsappShareLink } from './format/chat';
import { levelAtLeast, levelFromScore, maxLevel } from './levels';
import { normalizeVerdict } from './normalize';
import type { Reason, ScanInput, Verdict } from './types';

describe('extract', () => {
  it('normalizes Nigerian phone numbers to E.164', () => {
    expect(normalizePhone('0803 123 4567')).toBe('+2348031234567');
    expect(normalizePhone('+234 803-123-4567')).toBe('+2348031234567');
    expect(normalizePhone('2349012345678')).toBe('+2349012345678');
    expect(normalizePhone('12345')).toBeNull();
  });

  it('refangs obfuscated links', () => {
    expect(refang('hxxps://evil[.]top/login')).toBe('https://evil.top/login');
    expect(refang('visit win-iphone dot xyz now')).toBe('visit win-iphone.xyz now');
  });

  it('pulls out links, phones, accounts, amounts and codes', () => {
    const x = extract({
      text: 'Pay ₦25,000 or 50k to 0123456789 (GTB). Call 08031234567. Code 482-913. Visit gtbank-verify.xyz/login and mail a@b.com',
    });
    expect(x.urls.map((u) => u.domain)).toEqual(['gtbank-verify.xyz']);
    expect(x.phones).toEqual(['+2348031234567']);
    expect(x.accounts).toEqual(['0123456789']);
    expect(x.amounts).toEqual(expect.arrayContaining([25000, 50000]));
    expect(x.codes).toContain('482913');
    expect(x.emails).toEqual(['a@b.com']);
  });

  it('folds homoglyphs and leetspeak for the rules', () => {
    const x = extract({ text: 'Yоur ассоunt will be bl0cked' }); // Cyrillic о/а/с
    expect(x.text).toContain('your account will be blocked');
  });

  it('does not treat file names as links', () => {
    expect(extract({ text: 'see report.pdf and notes.txt' }).urls).toHaveLength(0);
  });
});

function verdict(partial: Partial<Verdict>): Verdict {
  return {
    level: 'SAFE',
    score: 0,
    category: null,
    reasons: [],
    actions: [],
    summary: { en: '', pidgin: '' },
    indicators: { urls: [], domains: [], phones: [], accounts: [], emails: [], wallets: [] },
    usedLlm: false,
    fingerprint: null,
    contentHash: '',
    ...partial,
  };
}

const floorReason: Reason = { id: 'x.hard', weight: 0.9, floor: 'DANGEROUS', source: 'rule', category: 'malware', text: { en: 'Hard signal', pidgin: 'Hard signal' } };

describe('levels', () => {
  it('maps scores to levels and compares them', () => {
    expect(levelFromScore(0)).toBe('SAFE');
    expect(levelFromScore(25)).toBe('SUSPICIOUS');
    expect(levelFromScore(50)).toBe('LIKELY_SCAM');
    expect(levelFromScore(99)).toBe('DANGEROUS');
    expect(maxLevel('SUSPICIOUS', 'DANGEROUS')).toBe('DANGEROUS');
    expect(levelAtLeast('LIKELY_SCAM', 'SUSPICIOUS')).toBe(true);
    expect(levelAtLeast('SAFE', 'SUSPICIOUS')).toBe(false);
  });
});

describe('normalizeVerdict (shell guarantees)', () => {
  const input: ScanInput = { channel: 'web', text: 'Hello  there' };

  it('never lets a verdict sit below its highest hard floor', () => {
    const v = normalizeVerdict(verdict({ level: 'SAFE', score: 3, reasons: [floorReason] }), input);
    expect(v.level).toBe('DANGEROUS');
    expect(v.score).toBeGreaterThanOrEqual(75);
    expect(v.category).toBeNull(); // the engine did not set one
  });

  it('ignores floors on non-positive reasons and keeps level consistent with score', () => {
    const v = normalizeVerdict(verdict({ level: 'SAFE', score: 60, reasons: [{ ...floorReason, weight: -0.2 }] }), input);
    expect(v.level).toBe('LIKELY_SCAM');
    expect(v.reasons[0].floor).toBeUndefined();
  });

  it('computes the content hash itself and recomputes advice', () => {
    const v = normalizeVerdict(verdict({ level: 'LIKELY_SCAM', score: 60, category: 'phishing', contentHash: 'engine-made', actions: [{ en: 'x', pidgin: 'x' }] }), input);
    expect(v.contentHash).toBe(contentHashOf(input));
    expect(v.contentHash).not.toBe('engine-made');
    expect(v.actions.length).toBeGreaterThan(1);
    expect(v.summary.en).not.toBe('');
  });

  it('drops malformed reasons and junk values', () => {
    const raw = verdict({
      level: 'NOPE' as never,
      score: Number.NaN,
      category: 'made-up' as never,
      reasons: [null as never, { id: '', weight: 1 } as never, { id: 'ok', weight: 7, source: 'weird' as never, text: { en: 'fine', pidgin: '' } }],
      indicators: { urls: ['a', 5 as never], domains: 'nope' as never, phones: [], accounts: [], emails: [], wallets: [] },
      fingerprint: 'f'.repeat(500),
    });
    const v = normalizeVerdict(raw, input, { id: 't', version: '1.0.0' });
    expect(v.reasons).toEqual([{ id: 'ok', weight: 1, source: 'rule', text: { en: 'fine', pidgin: 'fine' } }]);
    expect(v.score).toBe(0);
    expect(v.level).toBe('SAFE');
    expect(v.category).toBeNull();
    expect(v.indicators.urls).toEqual(['a']);
    expect(v.indicators.domains).toEqual([]);
    expect(v.fingerprint).toBeNull();
    expect(v.engine).toEqual({ id: 't', version: '1.0.0' });
  });

  it('hashes long text the same way engines see it', () => {
    const long = 'a'.repeat(7000);
    expect(contentHashOf({ text: long })).toBe(contentHashOf({ text: long.slice(0, 6000) }));
  });
});

describe('chat format', () => {
  it('renders WhatsApp text with defanged links and a share link', () => {
    const v = normalizeVerdict(
      verdict({
        level: 'LIKELY_SCAM',
        score: 70,
        category: 'phishing',
        reasons: [{ id: 'x.link', weight: 0.5, source: 'url', text: { en: 'The link pretends to be a bank', pidgin: 'The link dey pretend say na bank' } }],
        indicators: { urls: ['http://bank-login-check.example/verify'], domains: ['bank-login-check.example'], phones: [], accounts: [], emails: [], wallets: [] },
      }),
      { channel: 'whatsapp', text: 'see http://bank-login-check.example/verify' },
    );
    const msg = verdictToChat(v, 'en');
    expect(msg).toMatch(/\*Likely a scam\*/);
    expect(msg).toContain('hxxp://bank-login-check[.]example');
    expect(msg).not.toContain('http://bank-login-check.example');
    expect(whatsappShareLink(warningMessage(v, 'pidgin'))).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
