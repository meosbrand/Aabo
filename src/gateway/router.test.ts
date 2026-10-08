import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeVerdict } from '@/core/normalize';
import { MemoryReputationStore } from '@/core/reputation-memory';
import type { ScanInput, Verdict } from '@/core/types';
import { createFakeEngine } from '../../tests/support/fake-engine';
import { FakeChannel } from './channels/fake';
import { createRouter } from './router';
import type { Identity, RouterServices } from './services';
import { toTelegramHtml } from './channels/telegram/adapter';

const engine = createFakeEngine();

function memoryServices(opts: { dailyLimit?: number } = {}) {
  const identities = new Map<string, Identity & { checks: number }>();
  const scans = new Map<string, Verdict>();
  const reports: string[] = [];
  const safe: string[] = [];
  const store = new MemoryReputationStore().add({ type: 'phone', value: '+2349099990000', source: 'community', confidence: 0.96, reports: 9, category: 'fake_alert' });
  const analyze = async (input: ScanInput) => normalizeVerdict(await engine.analyze(input, { reputation: store }), input);
  let n = 0;
  const services: RouterServices = {
    async getIdentity(channel, externalId) {
      const key = `${channel}:${externalId}`;
      if (!identities.has(key)) {
        identities.set(key, { id: `id-${identities.size + 1}`, channel, externalId, language: 'en', tipsOptIn: false, blocked: false, checks: 0 });
      }
      return { ...identities.get(key)! };
    },
    async updateIdentity(id, patch) {
      for (const v of identities.values()) if (v.id === id) Object.assign(v, patch);
    },
    async consumeCheck(identity) {
      const v = [...identities.values()].find((x) => x.id === identity.id)!;
      const limit = opts.dailyLimit ?? 20;
      if (v.checks >= limit) return { ok: false, limit };
      v.checks++;
      return { ok: true, limit };
    },
    async scan(input) {
      const verdict = await analyze(input);
      const scanId = `scan-${++n}`;
      scans.set(scanId, verdict);
      return { scanId, verdict, seenCount: 1 };
    },
    async getVerdict(id) {
      return scans.get(id) ?? null;
    },
    async report(id) {
      reports.push(id);
      return true;
    },
    async markSafe(id) {
      safe.push(id);
    },
    async lookup(raw) {
      const digits = raw.replace(/\D/g, '');
      const value = digits.startsWith('0') ? `+234${digits.slice(1)}` : raw;
      const info = await store.lookup('phone', value);
      const verdict = await analyze({ channel: 'web', phone: raw });
      return { type: 'phone', value, reports: info?.reports ?? 0, confirmed: (info?.confidence ?? 0) >= 0.85, safe: false, category: info?.category ?? null, label: null, verdict };
    },
    async linkAccount(code) {
      return code.toUpperCase() === 'AB12CD' ? { ok: true, name: 'Ada Stores' } : { ok: false };
    },
    async ask(q) {
      return `ANSWER: ${q}`;
    },
    async recordQuiz() {},
  };
  return { services, reports, safe, identities };
}

describe('gateway router', () => {
  let ch: FakeChannel;
  let mem: ReturnType<typeof memoryServices>;

  beforeEach(async () => {
    ch = new FakeChannel();
    mem = memoryServices();
    const router = createRouter(mem.services, { typingDelayMs: 0, appUrl: 'https://aabo.test' });
    await ch.start((msg) => router.handle(msg, ch));
  });

  it('greets with the menu', async () => {
    const [reply] = await ch.receive({ text: 'Hi' });
    expect(reply).toMatch(/Welcome to Ààbò/);
  });

  it('checks a forwarded scam and supports REPORT / WARN / SAFE', async () => {
    const [verdict] = await ch.receive({ text: 'Hello dear, I mistakenly sent my WhatsApp code to your number. Please send me the 6 digit code.', isForwarded: true });
    expect(verdict).toMatch(/Dangerous/);
    expect(verdict).toMatch(/Reply \*REPORT\*/);

    expect((await ch.receive({ text: 'report' }))[0]).toMatch(/Reported/);
    expect(mem.reports).toEqual(['scan-1']);

    const warn = await ch.receive({ text: 'warn' });
    expect(warn).toHaveLength(2);
    expect(warn[1]).toMatch(/SCAM ALERT/);

    expect((await ch.receive({ text: 'safe' }))[0]).toMatch(/Thanks/);
    expect(mem.safe).toEqual(['scan-1']);
  });

  it('flags .apk documents instantly', async () => {
    const [reply] = await ch.receive({ document: { fileName: 'GTBank_Update.apk', mime: 'application/vnd.android.package-archive' } });
    expect(reply).toMatch(/Dangerous/);
    expect(reply).toMatch(/app\/program file/);
  });

  it('looks up numbers (check command and shared contact cards)', async () => {
    expect((await ch.receive({ text: 'check 0909 999 0000' }))[0]).toMatch(/confirmed scam/);
    expect((await ch.receive({ contact: { name: 'Mr X', phones: ['+2349099990000'] } }))[0]).toMatch(/confirmed scam/);
  });

  it('switches to Pidgin and answers in Pidgin', async () => {
    expect((await ch.receive({ text: 'pidgin' }))[0]).toMatch(/Pidgin/);
    const [reply] = await ch.receive({ text: 'Abeg the OTP wey dem send you, forward am give me sharp sharp' });
    expect(reply).toMatch(/Danger — na scam/);
  });

  it('routes plain questions to the Co-pilot but checks messages with links', async () => {
    expect((await ch.receive({ text: 'How do I turn on two-step verification?' }))[0]).toBe('ANSWER: How do I turn on two-step verification?');
    expect((await ch.receive({ text: 'Is this real? https://gtbank-secure-login.online' }))[0]).toMatch(/scam/i);
  });

  it('checks the quoted message when the user replies "check"', async () => {
    const [reply] = await ch.receive({ text: 'check', quotedText: 'Pay ₦15,000 processing fee to secure your appointment letter. You have been shortlisted for employment.' });
    expect(reply).toMatch(/Job scam/);
  });

  it('runs a quiz', async () => {
    const [q] = await ch.receive({ text: 'quiz' });
    expect(q).toMatch(/Reply with A, B or C/);
    const [a] = await ch.receive({ text: 'B' });
    expect(a).toMatch(/Correct|Not quite/);
  });

  it('links a chat to a web account', async () => {
    expect((await ch.receive({ text: 'link ab12cd' }))[0]).toMatch(/Linked to your Ààbò account \(Ada Stores\)/);
    expect((await ch.receive({ text: 'link zzzzzz' }))[0]).toMatch(/invalid or expired/);
  });

  it('enforces the free daily quota', async () => {
    const ch2 = new FakeChannel();
    const mem2 = memoryServices({ dailyLimit: 1 });
    const router = createRouter(mem2.services, { typingDelayMs: 0, appUrl: 'https://aabo.test' });
    await ch2.start((msg) => router.handle(msg, ch2));
    await ch2.receive({ text: 'Win free 50GB data now, click http://mtn-free-data.xyz and share to 5 groups' });
    const [second] = await ch2.receive({ text: 'Another message to check for scams please, from my supplier' });
    expect(second).toMatch(/https:\/\/aabo.test\/check/);
  });

  it('ignores group chats', async () => {
    expect(await ch.receive({ text: 'hi', isGroup: true })).toEqual([]);
  });
});

describe('telegram formatting', () => {
  it('converts WhatsApp markup to safe HTML', () => {
    expect(toTelegramHtml('*Bold* and _it_ <script>')).toBe('<b>Bold</b> and <i>it</i> &lt;script&gt;');
  });
});
