import { describe, expect, it } from 'vitest';
import { evaluate } from '@/core/evaluate';
import { MemoryReputationStore } from '@/core/reputation-memory';
import type { LlmAnalyzer, UrlIntel } from '@/core/types';
import { engineContractSuite } from '../contract-suite';
import { exactFingerprint } from './analyze';
import { extract } from '@/core/extract';
import { createCommunityEngine } from './index';
import { COMMUNITY_SAMPLES } from './samples';

engineContractSuite('community', createCommunityEngine);

const engine = createCommunityEngine();

describe('community engine', () => {
  it('meets its evaluation targets', async () => {
    const r = await evaluate(engine, COMMUNITY_SAMPLES);
    const misses = r.rows.filter((row) => !row.ok).map((row) => `${row.problem} :: ${row.sample.text.slice(0, 60)}`);
    expect(misses).toEqual([]);
    expect(r.recall).toBeGreaterThanOrEqual(0.7);
    expect(r.falsePositiveRate).toBeLessThanOrEqual(0.1);
  });

  it('keeps genuine one-time-code SMS safe', async () => {
    const v = await engine.analyze({ channel: 'web', text: '<#> 551203 is your WhatsApp code. Do not share it with anybody.' }, {});
    expect(v.level).toBe('SAFE');
  });

  it('marks official domains as trusted and look-alikes as phishing', async () => {
    const ok = await engine.analyze({ channel: 'web', text: 'Statement ready at https://www.gtbank.com/personal' }, {});
    expect(ok.level).toBe('SAFE');
    expect(ok.indicators.trustedDomains).toEqual(['gtbank.com']);
    const fake = await engine.analyze({ channel: 'web', text: 'Statement ready at https://gtbank-statement.online/login' }, {});
    expect(fake.reasons.map((r) => r.id)).toContain('c.link_brand_name');
    expect(fake.indicators.trustedDomains).toEqual([]);
  });

  it('matches exact repeats of a reported message', async () => {
    const text = 'Your parcel is held at customs, pay the release charge today to collect it from our office';
    const fp = exactFingerprint(extract({ text: `${text}!!` }))!;
    expect(fp).toBe(exactFingerprint(extract({ text })));
    const store = new MemoryReputationStore().add({ type: 'fingerprint', value: fp, source: 'community', confidence: 0.9, reports: 5, category: 'advance_fee' });
    const v = await engine.analyze({ channel: 'web', text }, { reputation: store });
    expect(v.reasons.map((r) => r.id)).toContain('c.rep_confirmed.fingerprint');
    expect(v.level).toBe('DANGEROUS');
  });

  it('follows short links and checks where they go', async () => {
    const intel: UrlIntel = {
      feeds: async (url) => (url.includes('prize-claim.top') ? [{ source: 'urlhaus', threat: 'malware_download' }] : []),
      domainCreated: async () => new Date(Date.now() - 2 * 86_400_000),
      unshorten: async () => 'https://prize-claim.top/get',
    };
    const v = await engine.analyze({ channel: 'web', text: 'open https://bit.ly/abc' }, { urlIntel: intel });
    expect(v.level).toBe('DANGEROUS');
    expect(v.category).toBe('malware');
    expect(v.reasons.map((r) => r.id)).toEqual(expect.arrayContaining(['c.link_opens', 'c.feed_listed', 'c.link_new']));
  });

  it('reads screenshots through a vision model and re-checks the text', async () => {
    const seen: Array<string | undefined> = [];
    const ocr: LlmAnalyzer = {
      vision: true,
      analyze: async (req) => {
        seen.push(req.imageBase64);
        return { riskScore: 30, category: null, redFlags: [], explanationEn: 'A chat screenshot.', explanationPidgin: 'Chat screenshot.', extractedText: 'Please forward the OTP you just got, I sent it by mistake' };
      },
    };
    const v = await engine.analyze({ channel: 'web', imageBase64: 'aGVsbG8=', imageMime: 'image/png' }, { llm: ocr });
    expect(seen).toEqual(['aGVsbG8=']);
    expect(v.ocrText).toMatch(/OTP/);
    expect(v.reasons.map((r) => r.id)).toContain('c.code_request');
    expect(v.reasons.map((r) => r.id)).not.toContain('ocr.unavailable');
  });

  it('never sends images to a model without vision', async () => {
    const seen: Array<string | undefined> = [];
    const textOnly: LlmAnalyzer = {
      vision: false,
      analyze: async (req) => {
        seen.push(req.imageBase64);
        return null;
      },
    };
    const v = await engine.analyze({ channel: 'web', imageBase64: 'aGVsbG8=', imageMime: 'image/png' }, { llm: textOnly });
    expect(seen).toEqual([]);
    expect(v.reasons.map((r) => r.id)).toContain('ocr.unavailable');
  });

  it('lets the LLM raise a grey-zone message', async () => {
    const worried: LlmAnalyzer = {
      analyze: async () => ({ riskScore: 95, category: 'romance', redFlags: ['love bombing'], explanationEn: 'Classic romance grooming.', explanationPidgin: 'Na love scam style.' }),
    };
    const v = await engine.analyze({ channel: 'guardian', text: 'My dear, I feel we are meant for each other. Keep this between us.', conversation: ['hi', 'hello'] }, { llm: worried });
    expect(v.usedLlm).toBe(true);
    expect(v.level === 'LIKELY_SCAM' || v.level === 'DANGEROUS').toBe(true);
    expect(v.category).toBe('romance');
  });
});
