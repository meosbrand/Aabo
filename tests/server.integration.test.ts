import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FeedPolicy, GuardianPolicy } from '@/core/engine';
import { parseUrl } from '@/core/extract';
import { COMMUNITY_FEED_POLICY } from '@/engines/community/policies';
import { basicGuardianPolicy } from '@/engines/community/guardian';
import { prisma } from '@/server/db';
import { __setEngineForTests } from '@/server/engine-loader';
import { reportScan, runScan } from '@/server/scans';
import { lookupSummary } from '@/server/lookup';
import { GuardianHost } from '@/gateway/guardian';
import { prismaServices } from '@/gateway/prisma-services';
import { createFakeEngine } from './support/fake-engine';

let userId = '';

beforeAll(async () => {
  __setEngineForTests(createFakeEngine());
  const user = await prisma.user.create({ data: { id: 'u-test', name: 'Ada', email: 'ada@test.ng', alertThreshold: 'SUSPICIOUS' } });
  userId = user.id;
});

afterAll(() => __setEngineForTests(null));

describe('scan storage', () => {
  it('stores a redacted excerpt and counts repeat checks', async () => {
    const text = 'Please send me the 6 digit code 482913 you received, I sent it by mistake. Acct 0123456789';
    const a = await runScan({ text, channel: 'web' }, { storeExcerpt: true });
    const b = await runScan({ text, channel: 'web' }, { storeExcerpt: true });
    expect(a.verdict.level).toBe('DANGEROUS');
    expect(b.seenCount).toBe(2);
    const row = await prisma.scan.findUnique({ where: { id: a.scanId } });
    expect(row?.excerpt).not.toContain('482913');
    expect(row?.excerpt).not.toContain('0123456789');
  });
});

describe('community reports (Truecaller layer)', () => {
  it('aggregates reports into indicators visible to lookups', async () => {
    const text = 'Your Opay wallet is blocked. Call 0909 111 2233 now and pay the reactivation fee into 2233445566.';
    for (let i = 0; i < 2; i++) {
      const { scanId } = await runScan({ text: `${text} (${i})`, channel: 'web' }, { storeExcerpt: true });
      await reportScan(scanId, { userId });
    }
    const phone = await prisma.indicator.findUnique({ where: { type_value: { type: 'phone', value: '+2349091112233' } } });
    expect(phone?.reports).toBe(2);
    const look = await lookupSummary('09091112233');
    expect(look?.reports).toBe(2);
    expect(look?.verdict.reasons.some((r) => r.id === 'fake.rep.phone')).toBe(true);
  });
});

describe('Guardian', () => {
  it('warns only the owner, stores no message text, and de-duplicates', async () => {
    const session = await prisma.waSession.create({ data: { kind: 'GUARDIAN', ownerUserId: userId, phone: '+2348030000000' } });
    const guardian = new GuardianHost();
    const sent: string[] = [];
    const sink = { notifyOwner: async (t: string) => void sent.push(t) };
    const owner = { userId, sessionId: session.id, scanGroups: false };
    const scam = {
      channel: 'whatsapp' as const,
      chatId: '2349011112222@s.whatsapp.net',
      senderId: '2349011112222@s.whatsapp.net',
      senderName: 'Mr Bello',
      senderPhone: '+2349011112222',
      messageId: 'x1',
      timestamp: Date.now(),
      text: 'Good morning, this is EFCC. Your account is flagged for money laundering. Pay a clearance fee of 250k within 2 hours to avoid a warrant of arrest.',
    };

    await guardian.handle(owner, scam, sink);
    await guardian.handle(owner, { ...scam, messageId: 'x2' }, sink);
    await guardian.handle(owner, { ...scam, messageId: 'x3', text: 'Good evening, do you still have the blue ankara fabric?' }, sink);
    await guardian.handle(owner, { ...scam, messageId: 'x4', isGroup: true }, sink);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(/Ààbò Guardian/);
    expect(sent[0]).toMatch(/Mr Bello/);
    const alerts = await prisma.alert.findMany({ where: { userId } });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].sender).toContain('•••');
    const guardianScans = await prisma.scan.findMany({ where: { channel: 'guardian' } });
    expect(guardianScans.length).toBe(3);
    expect(guardianScans.every((s) => s.excerpt === null)).toBe(true);
  });

  it('enforces the owner threshold, the guardian channel and a notice cap whatever the policy says', async () => {
    const session = await prisma.waSession.create({ data: { kind: 'GUARDIAN', ownerUserId: userId, phone: '+2348030000001' } });
    const pushy: GuardianPolicy = {
      ...basicGuardianPolicy,
      toScanInput: (msg) => ({ channel: 'web', text: msg.text }),
      shouldAlert: () => true,
      notice: () => 'x'.repeat(5000),
    };
    const guardian = new GuardianHost(async () => pushy);
    const sent: string[] = [];
    const sink = { notifyOwner: async (t: string) => void sent.push(t) };
    const owner = { userId, sessionId: session.id, scanGroups: false };
    const base = { channel: 'whatsapp' as const, chatId: 'c2', senderId: 's2', messageId: 'y1', timestamp: Date.now() };
    const before = await prisma.scan.count({ where: { channel: 'guardian' } });

    await guardian.handle(owner, { ...base, text: 'Are you open on Sunday?' }, sink);
    expect(sent).toHaveLength(0); // SAFE is below the owner's threshold

    await guardian.handle(owner, { ...base, messageId: 'y2', text: 'This is EFCC, there is a warrant of arrest on you' }, sink);
    expect(sent).toHaveLength(1);
    expect(sent[0].length).toBe(1500);
    const scans = await prisma.scan.findMany({ where: { channel: 'guardian' }, orderBy: { createdAt: 'asc' } });
    expect(scans.length).toBe(before + 2);
    expect(scans.every((x) => x.excerpt === null)).toBe(true);
  });
});

describe('chat services', () => {
  it('enforces the daily quota and links accounts with one-time codes', async () => {
    process.env.FREE_DAILY_CHECKS = '20';
    const id = await prismaServices.getIdentity('whatsapp', '2348077778888@s.whatsapp.net', { phone: '+2348077778888' });
    for (let i = 0; i < 20; i++) expect((await prismaServices.consumeCheck(id)).ok).toBe(true);
    expect((await prismaServices.consumeCheck(id)).ok).toBe(false);

    await prisma.linkCode.create({ data: { code: 'ABC234', userId, expiresAt: new Date(Date.now() + 60_000) } });
    expect((await prismaServices.linkAccount('abc234', id)).ok).toBe(true);
    expect((await prismaServices.linkAccount('abc234', id)).ok).toBe(false);
    const linked = await prisma.channelIdentity.findUnique({ where: { id: id.id } });
    expect(linked?.userId).toBe(userId);
    expect((await prisma.user.findUnique({ where: { id: userId } }))?.phone).toBe('+2348077778888');
  });
});

describe('threat feeds and retention', () => {
  it('imports feed entries through the engine policy and never touches safe indicators', async () => {
    const { parseTextFeed, importFeed } = await import('@/server/feeds');
    const entries = parseTextFeed(
      '# comment\nhttps://gtbank-verify-login.top/secure\nhttps://my-phish.web.app/login\nhttps://bit.ly/abc123\nnot a url\n',
      'openphish',
      'phishing',
    );
    expect(entries).toHaveLength(3);

    // Community policy: exact URLs only.
    expect(await importFeed(entries, COMMUNITY_FEED_POLICY)).toEqual({ created: 3, updated: 0 });
    expect(await prisma.indicator.count({ where: { type: 'domain', source: { startsWith: 'feed:' } } })).toBe(0);
    expect(await importFeed(entries, COMMUNITY_FEED_POLICY)).toEqual({ created: 0, updated: 3 });

    // An engine policy can add more, but only feed-sourced seeds are stored and safe rows are left alone.
    await prisma.indicator.create({ data: { type: 'domain', value: 'web.app', source: 'curated', confidence: 1, safe: true } });
    const domains: FeedPolicy = {
      indicators: (e) => {
        const p = parseUrl(e.url)!;
        return [
          { type: 'domain', value: p.domain ?? p.hostname, category: 'phishing', source: `feed:${e.source}`, confidence: 0.9 },
          { type: 'phone', value: '+2340000000000', source: 'curated', confidence: 1 },
        ];
      },
      pruneAfterDays: 30,
    };
    expect((await importFeed(entries, domains)).created).toBe(2);
    expect((await prisma.indicator.findUnique({ where: { type_value: { type: 'domain', value: 'web.app' } } }))?.source).toBe('curated');
    expect(await prisma.indicator.count({ where: { type: 'phone', value: '+2340000000000' } })).toBe(0);
    const look = await lookupSummary('gtbank-verify-login.top');
    expect(look?.confirmed).toBe(true);
  });

  it('drops old excerpts and scans', async () => {
    const { runRetention } = await import('@/server/retention');
    const old = await prisma.scan.create({
      data: { channel: 'web', inputType: 'text', contentHash: 'old', excerpt: 'old message', level: 'SAFE', score: 0, reasons: [], indicators: {}, createdAt: new Date(Date.now() - 40 * 86_400_000) },
    });
    const res = await runRetention();
    expect(res.excerpts).toBeGreaterThanOrEqual(1);
    expect((await prisma.scan.findUnique({ where: { id: old.id } }))?.excerpt).toBeNull();
  });
});
