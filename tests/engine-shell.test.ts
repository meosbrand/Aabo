import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINE_API_VERSION, type ScanEngine } from '@/core/engine';
import { sha256 } from '@/core/hash';
import type { Verdict } from '@/core/types';
import { analyzeInput } from '@/server/engine';
import { __setEngineForTests, engineInfo, loadEngine } from '@/server/engine-loader';
import { publicReasonId, toPublicVerdict } from '@/server/verdict-public';

const ENV = ['AABO_ENGINE', 'AABO_ENGINE_MODULE', 'AABO_ENGINE_REQUIRED'] as const;

afterEach(() => {
  for (const k of ENV) delete process.env[k];
  __setEngineForTests(null);
  vi.restoreAllMocks();
});

describe('engine loader', () => {
  it('runs the community engine by default', async () => {
    expect((await loadEngine()).id).toBe('community');
    expect(engineInfo()).toMatchObject({ id: 'community', requested: 'community', fallback: false });
  });

  it('loads an engine module by path', async () => {
    process.env.AABO_ENGINE = 'module';
    process.env.AABO_ENGINE_MODULE = './tests/fixtures/engine-ok.mjs';
    expect((await loadEngine()).id).toBe('fixture');
    expect(engineInfo()).toMatchObject({ id: 'fixture', version: '1.2.3', fallback: false });
  });

  it('falls back to the community engine when a module is incompatible', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.AABO_ENGINE = 'module';
    process.env.AABO_ENGINE_MODULE = './tests/fixtures/engine-bad-version.mjs';
    expect((await loadEngine()).id).toBe('community');
    expect(engineInfo()?.fallback).toBe(true);
    expect(engineInfo()?.error).toMatch(/API 99/);
    expect(log).toHaveBeenCalled();
  });

  it('falls back for missing modules and unsupported modes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.AABO_ENGINE = 'module';
    process.env.AABO_ENGINE_MODULE = './tests/fixtures/does-not-exist.mjs';
    expect((await loadEngine()).id).toBe('community');
    __setEngineForTests(null);
    process.env.AABO_ENGINE = 'remote';
    expect((await loadEngine()).id).toBe('community');
    expect(engineInfo()?.error).toMatch(/remote/);
  });

  it('refuses to fall back when the engine is required', async () => {
    process.env.AABO_ENGINE = 'module';
    process.env.AABO_ENGINE_MODULE = './tests/fixtures/engine-bad-version.mjs';
    process.env.AABO_ENGINE_REQUIRED = '1';
    await expect(loadEngine()).rejects.toThrow(/failed to load/);
  });
});

describe('analyzeInput', () => {
  it('stamps the engine and enforces floors and hashing for module engines', async () => {
    process.env.AABO_ENGINE = 'module';
    process.env.AABO_ENGINE_MODULE = './tests/fixtures/engine-ok.mjs';
    const v = await analyzeInput({ channel: 'web', text: 'hello' }, { llmMode: 'never' });
    expect(v.level).toBe('DANGEROUS');
    expect(v.score).toBeGreaterThanOrEqual(75);
    expect(v.contentHash).not.toBe('whatever');
    expect(v.engine).toEqual({ id: 'fixture', version: '1.2.3' });
    expect((v as unknown as Record<string, unknown>).text).toBeUndefined();
  });

  it('falls back to the built-in engine when the loaded engine throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken: ScanEngine = {
      id: 'broken',
      version: '0.0.1',
      apiVersion: ENGINE_API_VERSION,
      analyze: async () => {
        throw new Error('kaput');
      },
    };
    __setEngineForTests(broken);
    const v = await analyzeInput({ channel: 'whatsapp', text: 'install', fileName: 'x.apk' }, { llmMode: 'never' });
    expect(v.engine).toEqual({ id: 'community', version: expect.any(String), fallback: true });
    expect(v.level).toBe('DANGEROUS');
  });
});

describe('public verdict projection', () => {
  const v: Verdict = {
    level: 'DANGEROUS',
    score: 90,
    category: 'malware',
    reasons: [
      { id: 'secret.rule', weight: 0.42, floor: 'DANGEROUS', source: 'rule', category: 'malware', text: { en: 'A', pidgin: 'A' } },
      { id: 'c.link_short', weight: 0.2, source: 'url', text: { en: 'B', pidgin: 'B' } },
      { id: 'safe.contact', weight: -0.3, source: 'safe', text: { en: 'C', pidgin: 'C' } },
      { id: 'ocr.unavailable', weight: 0, source: 'llm', text: { en: 'D', pidgin: 'D' } },
    ],
    actions: [],
    summary: { en: 's', pidgin: 's' },
    indicators: { urls: [], domains: [], phones: [], accounts: [], emails: [], wallets: [] },
    usedLlm: false,
    fingerprint: 'abcdef',
    contentHash: 'h',
    engine: { id: 'x', version: '1.0.0' },
  };

  it('hides weights, floors, fingerprints and private signal ids', () => {
    const p = toPublicVerdict(v);
    expect(p.fingerprint).toBeNull();
    expect(p.reasons.map((r) => r.weight)).toEqual([1, 1, -1, 0]);
    expect(p.reasons.some((r) => 'floor' in r)).toBe(false);
    expect(p.reasons.map((r) => r.id)).toEqual([`r_${sha256('secret.rule').slice(0, 8)}`, 'c.link_short', 'safe.contact', 'ocr.unavailable']);
    expect(JSON.stringify(p)).not.toContain('secret.rule');
    expect(p.engine).toEqual({ id: 'x', version: '1.0.0' });
  });

  it('keeps public ids stable', () => {
    expect(publicReasonId('engine.fallback')).toBe('engine.fallback');
    expect(publicReasonId('llm.opinion')).toBe('llm.opinion');
    expect(publicReasonId('url.anything')).toMatch(/^r_[0-9a-f]{8}$/);
  });
});
