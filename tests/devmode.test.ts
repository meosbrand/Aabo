import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { __resetPlatformAiConfig } from '@/server/ai/config';
import { resolveAiConfig } from '@/server/ai/resolve';
import { createApiKey, verifyApiKey } from '@/server/api-keys';
import { prisma } from '@/server/db';
import { getDeveloperOverview, saveAiIntegration, saveIntelKey, setDeveloperMode, testAiIntegration } from '@/server/devmode';
import { invalidateOrgSettings, urlIntelFor } from '@/server/integrations';
import { orgActor, type OrgActor } from '@/server/org-auth';
import { connectionAad, hintOf, integrationAad, needsReseal, open, seal, sealedKid } from '@/server/secrets/crypto';
import { persistScan, submitReport } from '@/server/scans';
import { urlIntel as platformUrlIntel } from '@/server/url-intel';
import type { Verdict } from '@/core/types';

const K1 = 't1:BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=';
const K2 = 'k2:AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA=';

let owner: OrgActor;
let admin: OrgActor;
let member: OrgActor;
let orgId = '';

beforeAll(async () => {
  const org = await prisma.organization.create({ data: { name: 'Ada Stores' } });
  orgId = org.id;
  const mk = async (id: string, role: string) => {
    await prisma.user.create({ data: { id, name: id, email: `${id}@dev.test` } });
    await prisma.membership.create({ data: { userId: id, orgId, role } });
    return (await orgActor(id, orgId))!;
  };
  owner = await mk('dev-owner', 'owner');
  admin = await mk('dev-admin', 'admin');
  member = await mk('dev-member', 'member');
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetPlatformAiConfig();
  invalidateOrgSettings();
});

describe('sealed secrets', () => {
  it('round-trips and binds secrets to their row', () => {
    const s = seal('sk-very-secret-value', integrationAad('o1', 'ai'));
    expect(s).toMatch(/^v1\.t1\./);
    expect(s).not.toContain('secret');
    expect(open(s, integrationAad('o1', 'ai'))).toBe('sk-very-secret-value');
    expect(() => open(s, integrationAad('o2', 'ai'))).toThrow(/authentication/);
    expect(() => open(s, connectionAad('o1', 'ai'))).toThrow();
    const parts = s.split('.');
    parts[4] = Buffer.from('tampered!').toString('base64url');
    expect(() => open(parts.join('.'), integrationAad('o1', 'ai'))).toThrow();
    expect(hintOf('sk-very-secret-value')).toBe('…alue');
    expect(hintOf('short')).toBe('…');
  });

  it('rotates keys: new key seals, old keys still open', () => {
    const old = seal('token-1234567890', 'aad');
    vi.stubEnv('AABO_SECRET_KEYS', `${K2},${K1}`);
    expect(open(old, 'aad')).toBe('token-1234567890');
    expect(needsReseal(old)).toBe(true);
    const fresh = seal('token-1234567890', 'aad');
    expect(sealedKid(fresh)).toBe('k2');
    vi.stubEnv('AABO_SECRET_KEYS', K2);
    expect(() => open(old, 'aad')).toThrow(/not in AABO_SECRET_KEYS/);
    vi.stubEnv('AABO_SECRET_KEYS', '');
    expect(() => seal('x', 'aad')).toThrow(/not configured/);
  });
});

describe('Developer Mode permissions', () => {
  it('lets only the owner switch it on, and only with a keyring', async () => {
    expect(await setDeveloperMode(member, true)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(await setDeveloperMode(admin, true)).toMatchObject({ ok: false, code: 'forbidden' });
    vi.stubEnv('AABO_SECRET_KEYS', '');
    expect(await setDeveloperMode(owner, true)).toMatchObject({ ok: false, code: 'secrets_unavailable' });
    vi.unstubAllEnvs();
    vi.stubEnv('DEVELOPER_MODE', 'off');
    expect(await setDeveloperMode(owner, true)).toMatchObject({ ok: false, code: 'operator_off' });
    vi.unstubAllEnvs();
    expect(await setDeveloperMode(owner, true)).toEqual({ ok: true });
  });

  it('hides settings from members and needs Developer Mode to edit', async () => {
    expect(await getDeveloperOverview(member)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(await getDeveloperOverview(null)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(await saveIntelKey(member, 'urlhaus', 'abc')).toMatchObject({ ok: false, code: 'forbidden' });
    expect((await getDeveloperOverview(admin)).ok).toBe(true);
    await prisma.organization.update({ where: { id: orgId }, data: { developerMode: false } });
    expect(await saveIntelKey(admin, 'urlhaus', 'abc')).toMatchObject({ ok: false, code: 'developer_mode_off' });
    await prisma.organization.update({ where: { id: orgId }, data: { developerMode: true } });
  });
});

describe('bring your own AI key', () => {
  it('stores the key sealed, shows only a hint and audits without secrets', async () => {
    const res = await saveAiIntegration(admin, { mode: 'byok', provider: 'groq', apiKey: 'gsk_live_supersecret_9876' });
    expect(res).toEqual({ ok: true });
    const row = await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind: 'ai' } } });
    expect(row?.secret).toMatch(/^v1\./);
    expect(JSON.stringify(row)).not.toContain('supersecret');
    const overview = await getDeveloperOverview(owner);
    expect(overview.ok).toBe(true);
    const text = JSON.stringify(overview);
    expect(text).not.toContain('supersecret');
    expect(text).not.toContain(row!.secret!);
    if (overview.ok) {
      expect(overview.overview.integrations.find((i) => i.kind === 'ai')).toMatchObject({ hint: '…9876', status: 'unverified' });
      expect(overview.overview.audit.map((a) => a.action)).toContain('ai.save');
    }
    const audits = await prisma.auditEvent.findMany({ where: { orgId } });
    expect(JSON.stringify(audits)).not.toContain('supersecret');
  });

  it('keeps the stored key when the form leaves it blank, and validates input', async () => {
    expect(await saveAiIntegration(admin, { mode: 'byok', provider: 'groq', model: 'llama-x' })).toEqual({ ok: true });
    const cfg = await resolveAiConfig(orgId);
    expect(cfg).toMatchObject({ source: 'byok', provider: 'groq', model: 'llama-x', apiKey: 'gsk_live_supersecret_9876', allowPrivate: false });
    expect(await saveAiIntegration(admin, { mode: 'byok', provider: 'custom', baseURL: 'http://10.0.0.5/v1', model: 'm', apiKey: 'k-1234567890' })).toMatchObject({ ok: false, code: 'invalid' });
    // The stored key never follows a change of destination unless it is typed again.
    expect(await saveAiIntegration(admin, { mode: 'byok', provider: 'custom', baseURL: 'https://attacker.example/v1', model: 'm' })).toMatchObject({
      ok: false,
      code: 'invalid',
      message: expect.stringMatching(/Enter the API key again/),
    });
    expect(await testAiIntegration(admin, { mode: 'byok', provider: 'openrouter' })).toMatchObject({ ok: false, code: 'invalid' });
    expect(await saveAiIntegration(admin, { mode: 'byok', provider: 'openai', clearKey: true })).toMatchObject({ ok: false, code: 'invalid' });
    expect(await saveAiIntegration(admin, { mode: 'nope' })).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('uses BYOK over the platform, never falls back to the platform key, and honours off/platform', async () => {
    vi.stubEnv('AI_PROVIDER', 'openai');
    vi.stubEnv('AI_API_KEY', 'platform-key');
    expect((await resolveAiConfig(orgId))?.source).toBe('byok');
    expect((await resolveAiConfig(null))?.source).toBe('platform');

    // A broken stored secret means no AI at all, not the platform key.
    await prisma.orgIntegration.update({ where: { orgId_kind: { orgId, kind: 'ai' } }, data: { secret: seal('x', 'wrong-aad') } });
    invalidateOrgSettings(orgId);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await resolveAiConfig(orgId)).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect((await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind: 'ai' } } }))?.lastError).toBe('secret_unreadable');

    await saveAiIntegration(admin, { mode: 'off' });
    expect(await resolveAiConfig(orgId)).toBeNull();
    await saveAiIntegration(admin, { mode: 'platform' });
    expect((await resolveAiConfig(orgId))?.source).toBe('platform');
    expect((await resolveAiConfig(orgId))?.orgId).toBe(orgId);

    // Developer Mode off (or switched off by the operator): the platform again.
    await saveAiIntegration(admin, { mode: 'off' });
    vi.stubEnv('DEVELOPER_MODE', 'off');
    invalidateOrgSettings(orgId);
    expect((await resolveAiConfig(orgId))?.source).toBe('platform');
  });

  it('rate-limits connection tests and reports blocked private endpoints', async () => {
    await saveAiIntegration(admin, { mode: 'byok', provider: 'custom', baseURL: 'https://127.0.0.1/v1', model: 'm', apiKey: 'local-key-123456' });
    const r = await testAiIntegration(admin);
    expect(r.ok && r.result.code).toBe('blocked_address');
    expect((await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind: 'ai' } } }))?.status).toBe('error');
    for (let i = 0; i < 9; i++) await testAiIntegration(admin, { mode: 'byok', provider: 'custom', baseURL: 'https://127.0.0.1/v1', model: 'm' });
    expect(await testAiIntegration(admin)).toMatchObject({ ok: false, code: 'rate_limited' });
  });
});

describe('threat-intel keys', () => {
  it("uses the organisation's own keys only while Developer Mode is on", async () => {
    expect(await urlIntelFor(orgId)).toBe(platformUrlIntel);
    expect(await saveIntelKey(admin, 'safebrowsing', 'AIzaOrgOwnKey123456')).toEqual({ ok: true });
    const intel = await urlIntelFor(orgId);
    expect(intel).not.toBe(platformUrlIntel);
    expect(await urlIntelFor(null)).toBe(platformUrlIntel);
    expect(await saveIntelKey(admin, 'safebrowsing', 'has spaces')).toMatchObject({ ok: false, code: 'invalid' });
    expect(await saveIntelKey(admin, 'safebrowsing', null)).toEqual({ ok: true });
    expect(await urlIntelFor(orgId)).toBe(platformUrlIntel);
  });
});

describe('API keys', () => {
  it('stop working when their creator leaves the organisation', async () => {
    const plain = await createApiKey('test', { userId: 'dev-admin', orgId });
    const req = () => new Request('http://x/api/v1/scan', { headers: { authorization: `Bearer ${plain}` } });
    expect(await verifyApiKey(req())).not.toBeNull();
    await prisma.membership.deleteMany({ where: { userId: 'dev-admin', orgId } });
    expect(await verifyApiKey(req())).toBeNull();
  });
});

describe('tenant scoping', () => {
  const verdict = (hash: string): Verdict => ({
    level: 'SAFE',
    score: 0,
    category: null,
    reasons: [],
    actions: [],
    summary: { en: '', pidgin: '' },
    indicators: { urls: [], domains: [], phones: [], accounts: [], emails: [], wallets: [] },
    usedLlm: false,
    fingerprint: null,
    contentHash: hash,
    engine: { id: 'community', version: '1.0.0' },
  });

  it("never counts another organisation's own-number traffic", async () => {
    const input = { channel: 'whatsapp' as const, text: 'hi' };
    await persistScan(input, verdict('h-scope'), { connectionId: 'conn-a' });
    await persistScan(input, verdict('h-scope'), { connectionId: 'conn-a' });
    expect((await persistScan(input, verdict('h-scope'), { connectionId: 'conn-b' })).seenCount).toBe(1);
    expect((await persistScan(input, verdict('h-scope'), {})).seenCount).toBe(1);
    expect((await persistScan(input, verdict('h-scope'), { connectionId: 'conn-a' })).seenCount).toBe(4);
    const row = await prisma.scan.findFirst({ where: { contentHash: 'h-scope', connectionId: 'conn-b' } });
    expect(row?.engine).toBe('community@1.0.0');
  });

  it('keeps zero-trust reports out of reputation', async () => {
    await submitReport({ type: 'phone', value: '+2348011110000', trust: 0 });
    expect(await prisma.indicator.findUnique({ where: { type_value: { type: 'phone', value: '+2348011110000' } } })).toBeNull();
    expect((await prisma.report.findFirst({ where: { value: '+2348011110000' } }))?.status).toBe('PENDING');
  });
});
