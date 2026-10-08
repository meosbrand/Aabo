/**
 * @fileoverview Behaviour every ScanEngine must have, as a reusable vitest suite. Run it against
 * any engine: `engineContractSuite('my-engine', () => createEngine())`.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { ENGINE_API_VERSION, type ScanEngine } from '@/core/engine';
import { levelAtLeast, maxLevel } from '@/core/levels';
import { MemoryReputationStore } from '@/core/reputation-memory';
import { LEVELS, type EngineDeps, type Level, type LlmAnalyzer, type ScanInput, type UrlIntel, type Verdict } from '@/core/types';

const ODD_INPUTS: ScanInput[] = [
  { channel: 'web', text: '' },
  { channel: 'web', text: '   \n\t ' },
  { channel: 'web', text: 'x'.repeat(6000) },
  { channel: 'web', text: 'zero​width 🙂🙂 ﷽ ‮evil' },
  { channel: 'web', url: 'hxxp://weird[.]tld/%%%' },
  { channel: 'web', phone: 'not a number' },
  { channel: 'web', account: '12' },
  { channel: 'whatsapp', fileName: '', text: 'ok' },
];

function expectWellFormed(v: Verdict) {
  expect(LEVELS).toContain(v.level);
  expect(v.score).toBeGreaterThanOrEqual(0);
  expect(v.score).toBeLessThanOrEqual(100);
  expect(Array.isArray(v.reasons)).toBe(true);
  for (const r of v.reasons) {
    expect(typeof r.id).toBe('string');
    expect(Number.isFinite(r.weight)).toBe(true);
    expect(Math.abs(r.weight)).toBeLessThanOrEqual(1);
    expect(typeof r.text.en).toBe('string');
    expect(typeof r.text.pidgin).toBe('string');
  }
  for (const k of ['urls', 'domains', 'phones', 'accounts', 'emails', 'wallets'] as const) expect(Array.isArray(v.indicators[k])).toBe(true);
  expect(typeof v.usedLlm).toBe('boolean');
}

function highestFloor(v: Verdict): Level {
  return v.reasons.reduce<Level>((f, r) => (r.weight > 0 && r.floor ? maxLevel(f, r.floor) : f), 'SAFE');
}

const calmLlm = (calls: string[] = []): LlmAnalyzer => ({
  trusted: true,
  vision: true,
  analyze: async (req) => {
    calls.push(req.text);
    return { riskScore: 0, category: null, redFlags: [], explanationEn: 'Looks fine to me.', explanationPidgin: 'E be like say e fine.' };
  },
});

export function engineContractSuite(name: string, create: () => ScanEngine | Promise<ScanEngine>) {
  describe(`engine contract: ${name}`, () => {
    let engine: ScanEngine;
    beforeAll(async () => {
      engine = await create();
    });

    it('identifies itself', () => {
      expect(engine.id).toMatch(/^[a-z0-9][a-z0-9._-]{0,40}$/);
      expect(engine.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(engine.apiVersion).toBe(ENGINE_API_VERSION);
    });

    it('returns a well-formed verdict for empty and odd input', async () => {
      for (const input of ODD_INPUTS) {
        const v = await engine.analyze(input, {});
        expectWellFormed(v);
        expect(levelAtLeast(v.level, highestFloor(v))).toBe(true);
      }
    });

    it('keeps an ordinary message SAFE', async () => {
      const v = await engine.analyze({ channel: 'web', text: 'Good morning, please what time will the generator mechanic come today?' }, {});
      expect(v.level).toBe('SAFE');
    });

    it('flags an executable attachment', async () => {
      const v = await engine.analyze({ channel: 'whatsapp', text: 'see attached', fileName: 'Bank_Statement.apk', fileMime: 'application/vnd.android.package-archive' }, {});
      expect(levelAtLeast(v.level, 'LIKELY_SCAM')).toBe(true);
      expect(v.category).toBe('malware');
    });

    it('flags a request to forward a one-time code', async () => {
      const v = await engine.analyze({ channel: 'web', text: 'Hello, please forward the OTP that just came to your phone, I need it to finish my registration' }, {});
      expect(levelAtLeast(v.level, 'SUSPICIOUS')).toBe(true);
    });

    it('never lets a calm LLM lower a hard floor', async () => {
      const deps: EngineDeps = { llm: calmLlm(), llmMode: 'always' };
      const v = await engine.analyze({ channel: 'whatsapp', text: 'install this', fileName: 'Update.apk' }, deps);
      expect(levelAtLeast(v.level, 'LIKELY_SCAM')).toBe(true);
      expect(levelAtLeast(v.level, highestFloor(v))).toBe(true);
    });

    it('does not call the LLM when told not to', async () => {
      const calls: string[] = [];
      await engine.analyze({ channel: 'web', text: 'Is this real? You have won a prize, send your details' }, { llm: calmLlm(calls), llmMode: 'never' });
      expect(calls).toHaveLength(0);
    });

    it('says so when a screenshot cannot be read', async () => {
      const v = await engine.analyze({ channel: 'web', imageBase64: 'aGVsbG8=', imageMime: 'image/png' }, {});
      expect(v.reasons.some((r) => r.id === 'ocr.unavailable')).toBe(true);
    });

    it('uses community reputation', async () => {
      const store = new MemoryReputationStore().add({ type: 'phone', value: '+2348035550101', source: 'community', confidence: 0.97, reports: 21, category: 'fake_alert' });
      const v = await engine.analyze({ channel: 'web', text: 'Please call me back on 0803 555 0101 about the order' }, { reputation: store });
      expect(levelAtLeast(v.level, 'LIKELY_SCAM')).toBe(true);
    });

    it('does not raise risk for a verified-safe contact', async () => {
      const store = new MemoryReputationStore().add({ type: 'phone', value: '+2348035550102', source: 'curated', confidence: 1, reports: 0, safe: true, label: 'Customer care' });
      const v = await engine.analyze({ channel: 'web', text: 'Please call me back on 0803 555 0102 about the order' }, { reputation: store });
      expect(v.level).toBe('SAFE');
    });

    it('uses threat feeds', async () => {
      const intel: UrlIntel = {
        feeds: async (url) => (url.includes('pay-portal-check.top') ? [{ source: 'safebrowsing', threat: 'SOCIAL_ENGINEERING' }] : []),
        domainCreated: async () => null,
        unshorten: async () => null,
      };
      const v = await engine.analyze({ channel: 'web', text: 'Payment details here: https://pay-portal-check.top/form' }, { urlIntel: intel });
      expect(levelAtLeast(v.level, 'LIKELY_SCAM')).toBe(true);
    });

    it('survives failing dependencies', async () => {
      const boom = async () => {
        throw new Error('down');
      };
      const deps: EngineDeps = {
        reputation: { lookup: boom, fingerprints: boom },
        urlIntel: { feeds: boom, domainCreated: boom, unshorten: boom },
        llm: { analyze: boom },
        llmMode: 'always',
      };
      const v = await engine.analyze({ channel: 'web', text: 'Call 08031234567 or visit https://bit.ly/x1 to claim your free data now' }, deps);
      expectWellFormed(v);
    });

    it('has a usable Guardian policy (if any)', () => {
      const g = engine.guardian;
      if (!g) return;
      expect(g.toScanInput({ chatId: 'c', senderId: 's', text: '' }, [])).toBeNull();
      const input = g.toScanInput({ chatId: 'c', senderId: 's', text: 'hello' }, ['earlier']);
      expect(input?.channel).toBe('guardian');
      expect(g.dedupeMs).toBeGreaterThan(0);
      expect(g.contextTtlMs).toBeGreaterThan(0);
    });

    it('has a sane reputation policy (if any)', () => {
      const p = engine.reputation;
      if (!p) return;
      let prev = 0;
      for (let n = 1; n <= 50; n++) {
        const c = p.communityConfidence(n);
        expect(c).toBeGreaterThanOrEqual(prev);
        expect(c).toBeLessThan(p.confirmedAt);
        prev = c;
      }
      expect(p.reviewerConfidence).toBeGreaterThanOrEqual(p.confirmedAt);
      expect(p.minReportsToShow).toBeGreaterThanOrEqual(1);
    });
  });
}
