import { createHmac } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/webhooks/whatsapp/[provider]/[key]/route';
import { processInboundEvent, processPendingFor } from '@/gateway/inbound';
import { prismaServices } from '@/gateway/prisma-services';
import { runTips } from '@/gateway/tips';
import { invalidateConnection } from '@/server/channels/cloud/connections';
import { parseCloudPayload, parseTwilioForm } from '@/server/channels/cloud/parse';
import { twilioSignature, verifyMetaSignature, verifyTwilioSignature } from '@/server/channels/cloud/signature';
import { prisma } from '@/server/db';
import { createConnection, sendTestMessage, setDeveloperMode, updateConnection, verifyConnection } from '@/server/devmode';
import { __setEngineForTests } from '@/server/engine-loader';
import { orgActor, type OrgActor } from '@/server/org-auth';
import { rateLimit } from '@/server/rate-limit-store';
import { runRetention } from '@/server/retention';
import type { ConnectionSecrets, ConnectionView } from '@/lib/developer-types';
import { createFakeEngine } from './support/fake-engine';

// --- fake provider APIs -------------------------------------------------------------------------

interface Sent {
  provider: 'meta' | 'twilio' | 'd360';
  path: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}
const sent: Sent[] = [];
let failNextSend: { status: number; body: unknown } | null = null;
let server: http.Server;
let base = '';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const url = req.url ?? '';
      const json = (status: number, data: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      const provider = url.startsWith('/graph') ? 'meta' : url.startsWith('/twilio') ? 'twilio' : 'd360';
      if (req.method === 'POST' && /\/messages(\.json)?$|Messages\.json$/.test(url)) {
        sent.push({ provider, path: url, headers: req.headers, body });
        if (failNextSend) {
          const f = failNextSend;
          failNextSend = null;
          return json(f.status, f.body);
        }
        return json(200, { messages: [{ id: 'out-1' }], sid: 'SMout' });
      }
      if (req.method === 'POST' && url === '/d360/v1/configs/webhook') {
        sent.push({ provider, path: url, headers: req.headers, body });
        return json(200, {});
      }
      if (url.startsWith('/graph/media-1')) return json(200, { url: `${base}/media/blob`, mime_type: 'image/png', file_size: PNG.length });
      if (url === '/media/blob') {
        res.writeHead(200, { 'content-type': 'image/png' });
        return res.end(PNG);
      }
      if (url.startsWith('/graph/')) {
        if (req.headers.authorization !== 'Bearer EAA-test-access-token-0000000000') return json(401, { error: { code: 190 } });
        return json(200, { id: url.split('/')[2].split('?')[0], display_phone_number: '+234 801 234 5678' });
      }
      if (url.startsWith('/twilio/Accounts/')) return json(200, { sid: 'ok' });
      if (url === '/d360/v1/configs/webhook') return json(200, {});
      json(404, {});
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  vi.stubEnv('AABO_TEST_GRAPH_BASE', `${base}/graph`);
  vi.stubEnv('AABO_TEST_TWILIO_BASE', `${base}/twilio`);
  vi.stubEnv('AABO_TEST_D360_BASE', `${base}/d360`);
  vi.stubEnv('PUBLIC_WEBHOOK_BASE_URL', 'https://aabo.test');
  vi.stubEnv('AABO_WEBHOOK_INLINE', '0');
  __setEngineForTests(createFakeEngine());
});

afterAll(async () => {
  __setEngineForTests(null);
  vi.unstubAllEnvs();
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  sent.length = 0;
});

// --- helpers --------------------------------------------------------------------------------------

const APP_SECRET = 'testappsecret0123456789';
const TOKEN = 'EAA-test-access-token-0000000000';
const AUTH_TOKEN = '0123456789abcdef0123456789abcdef';
const ACCOUNT = 'AC00000000000000000000000000000001';

let admin: OrgActor;
let orgId = '';
let ip = 0;

async function setupOrg(name: string) {
  const org = await prisma.organization.create({ data: { name } });
  const userId = `wa-${name}`;
  await prisma.user.create({ data: { id: userId, name, email: `${userId}@wa.test` } });
  await prisma.membership.create({ data: { userId, orgId: org.id, role: 'owner' } });
  const actor = (await orgActor(userId, org.id))!;
  expect(await setDeveloperMode(actor, true)).toEqual({ ok: true });
  return { org, actor };
}

const keyOf = (url: string) => url.split('/').pop()!;

function req(url: string, init: RequestInit & { ip?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-forwarded-for', init.ip ?? `10.0.0.${++ip % 250}`);
  return new Request(url, { ...init, headers });
}

const ctx = (provider: string, key: string) => ({ params: Promise.resolve({ provider, key }) });

function metaPayload(pnid: string, messages: unknown[]) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: pnid }, contacts: [{ wa_id: '2348011112222', profile: { name: 'Chidi' } }], messages } }] }],
  });
}

function metaSign(body: string) {
  return `sha256=${createHmac('sha256', APP_SECRET).update(body).digest('hex')}`;
}

async function postMeta(key: string, body: string, sig = metaSign(body)) {
  return POST(req(`https://aabo.test/api/webhooks/whatsapp/meta/${key}`, { method: 'POST', body, headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' } }), ctx('meta', key));
}

const text = (id: string, body: string, from = '2348011112222') => ({ from, id, timestamp: '1700000000', type: 'text', text: { body } });

// --- tests ----------------------------------------------------------------------------------------

describe('webhook signatures (vectors computed with openssl)', () => {
  it('accepts the Meta vector and rejects tampering', () => {
    const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
    const sig = 'sha256=93dabb4dec71cfe49fcad13b546b0f5642e6775c0ccc33525a21a49137eecbdd';
    expect(verifyMetaSignature(body, sig, APP_SECRET)).toBe(true);
    expect(verifyMetaSignature(Buffer.from(`${body} `), sig, APP_SECRET)).toBe(false);
    expect(verifyMetaSignature(body, sig.slice(0, -2), APP_SECRET)).toBe(false);
    expect(verifyMetaSignature(body, null, APP_SECRET)).toBe(false);
  });

  it('accepts the Twilio vector (configured URL + sorted params)', () => {
    const url = 'https://aabo.test/api/webhooks/whatsapp/twilio/abcdefghijklmnopqrstuvwxyz012345';
    const params = new URLSearchParams({ To: 'whatsapp:+2348099990000', From: 'whatsapp:+2348011112222', Body: 'hello there', MessageSid: 'SM0001', AccountSid: ACCOUNT });
    expect(twilioSignature(url, params, AUTH_TOKEN)).toBe('42NXELgke1RgCZuPhz2cr2dnkNw=');
    expect(verifyTwilioSignature(url, params, '42NXELgke1RgCZuPhz2cr2dnkNw=', AUTH_TOKEN)).toBe(true);
    expect(verifyTwilioSignature(`${url}?x=1`, params, '42NXELgke1RgCZuPhz2cr2dnkNw=', AUTH_TOKEN)).toBe(false);
  });
});

describe('payload parsing', () => {
  it('reads text, images, documents, contacts and buttons for our number only', () => {
    const body = JSON.parse(
      metaPayload('111', [
        { ...text('m1', 'hi'), context: { forwarded: true } },
        { from: '2348011112222', id: 'm2', timestamp: '1', type: 'image', image: { id: 'media-1', mime_type: 'image/jpeg', caption: 'see' } },
        { from: '2348011112222', id: 'm3', timestamp: '1', type: 'document', document: { id: 'd1', filename: 'Invoice.apk', mime_type: 'application/vnd.android.package-archive' } },
        { from: '2348011112222', id: 'm4', timestamp: '1', type: 'contacts', contacts: [{ name: { formatted_name: 'Mr X' }, phones: [{ phone: '+2349099990000' }] }] },
        { from: '2348011112222', id: 'm5', timestamp: '1', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'b', title: 'quiz' } } },
        { from: '2348011112222', id: 'm6', timestamp: '1', type: 'audio', audio: { id: 'a' } },
      ]),
    );
    const parsed = parseCloudPayload(body, '111');
    expect(parsed.messages.map((m) => m.providerMessageId)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
    expect(parsed.messages[0]).toMatchObject({ text: 'hi', isForwarded: true, name: 'Chidi', timestamp: 1_700_000_000_000 });
    expect(parsed.messages[1].media).toEqual({ kind: 'image', ref: 'media-1', mime: 'image/jpeg' });
    expect(parsed.messages[2].media).toMatchObject({ kind: 'document', fileName: 'Invoice.apk' });
    expect(parsed.messages[3].contact).toEqual({ name: 'Mr X', phones: ['+2349099990000'] });
    expect(parsed.messages[4].text).toBe('quiz');
    expect(parsed.messages[5].unsupported).toBe(true);
    expect(parseCloudPayload(body, '999')).toEqual({ messages: [], foreign: 6 });
    const statusesOnly = { entry: [{ changes: [{ value: { metadata: { phone_number_id: '111' }, statuses: [{ id: 's' }] } }] }] };
    expect(parseCloudPayload(statusesOnly, '111')).toEqual({ messages: [], foreign: 0 });
    expect(parseCloudPayload('garbage', '111').messages).toEqual([]);
  });

  it('reads Twilio forms and refuses other accounts or numbers', () => {
    const form = new URLSearchParams({ MessageSid: 'SM1', AccountSid: ACCOUNT, From: 'whatsapp:+2348011112222', To: 'whatsapp:+2348099990000', Body: 'hi', NumMedia: '1', MediaUrl0: 'https://api.twilio.com/m/1', MediaContentType0: 'image/png' });
    const ok = parseTwilioForm(form, { accountSid: ACCOUNT, number: '+2348099990000' });
    expect(ok.messages[0]).toMatchObject({ providerMessageId: 'SM1', from: '+2348011112222', text: 'hi', media: { kind: 'image', ref: 'https://api.twilio.com/m/1' } });
    expect(parseTwilioForm(form, { accountSid: 'AC-other', number: '+2348099990000' })).toEqual({ messages: [], foreign: 1 });
    expect(parseTwilioForm(form, { accountSid: ACCOUNT, number: '+2348000000000' })).toEqual({ messages: [], foreign: 1 });
  });
});

describe('connecting numbers', () => {
  let meta: { connection: ConnectionView; secrets: ConnectionSecrets };

  beforeAll(async () => {
    const o = await setupOrg('Bola Fabrics');
    admin = o.actor;
    orgId = o.org.id;
  });

  it('creates a Meta connection, shows secrets once and stores them sealed', async () => {
    const res = await createConnection(admin, { provider: 'meta', label: 'Shop', phoneNumberId: '111222333', accessToken: TOKEN, appSecret: APP_SECRET, dailyLimitPerUser: 3 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    meta = res;
    expect(res.secrets.webhookUrl).toMatch(/^https:\/\/aabo\.test\/api\/webhooks\/whatsapp\/meta\/[A-Za-z0-9_-]{32}$/);
    expect(res.secrets.verifyToken).toHaveLength(32);
    const row = await prisma.channelConnection.findUniqueOrThrow({ where: { id: res.connection.id } });
    expect(row.secret).toMatch(/^v1\./);
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    expect(JSON.stringify(row)).not.toContain(res.secrets.verifyToken!);
    expect(row.status).toBe('pending');
    expect((await createConnection(admin, { provider: 'meta', label: 'Dup', phoneNumberId: '111222333', accessToken: TOKEN, appSecret: APP_SECRET })).ok).toBe(false);
    expect(await createConnection(admin, { provider: 'meta', label: 'Bad', phoneNumberId: 'abc', accessToken: TOKEN, appSecret: APP_SECRET })).toMatchObject({ ok: false, code: 'invalid' });
  });

  it('answers the Meta handshake only with the right token', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const url = (token: string) => `https://aabo.test/api/webhooks/whatsapp/meta/${key}?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=12345`;
    const ok = await GET(req(url(meta.secrets.verifyToken!)), ctx('meta', key));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('12345');
    expect((await GET(req(url('wrong')), ctx('meta', key))).status).toBe(403);
    const unknown = await GET(req(url('x').replace(key, 'x'.repeat(32))), ctx('meta', 'x'.repeat(32)));
    const wrongProvider = await GET(req(url('x')), ctx('twilio', key));
    expect(unknown.status).toBe(401);
    expect(wrongProvider.status).toBe(401);
    expect(await unknown.text()).toBe(await wrongProvider.text());
  });

  it('ignores messages until the credentials are verified', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const body = metaPayload('111222333', [text('early-1', 'hello')]);
    expect((await postMeta(key, body)).status).toBe(200);
    expect(await prisma.inboundEvent.count({ where: { connectionId: meta.connection.id } })).toBe(0);
  });

  it('verifies credentials with the provider', async () => {
    const res = await verifyConnection(admin, meta.connection.id);
    expect(res.ok && res.connection.status).toBe('verified');
    expect(res.ok && res.connection.displayNumber).toBe('+234 801 234 5678');
  });

  it('queues signed messages once, answers from the organisation number and forgets the payload', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const body = metaPayload('111222333', [text('wamid.1', 'Please forward the OTP code I sent you')]);
    expect((await postMeta(key, body)).status).toBe(200);
    expect((await postMeta(key, body)).status).toBe(200); // provider retry
    expect((await postMeta(key, body, 'sha256=00')).status).toBe(401);
    const events = await prisma.inboundEvent.findMany({ where: { connectionId: meta.connection.id } });
    expect(events).toHaveLength(1);
    await processPendingFor(meta.connection.id);
    const reply = sent.find((s) => s.provider === 'meta' && s.path.endsWith('/111222333/messages'));
    expect(reply?.headers.authorization).toBe(`Bearer ${TOKEN}`);
    const payload = JSON.parse(reply!.body);
    expect(payload).toMatchObject({ messaging_product: 'whatsapp', to: '2348011112222', type: 'text' });
    expect(payload.text.body).toMatch(/Dangerous/);
    const done = await prisma.inboundEvent.findUniqueOrThrow({ where: { id: events[0].id } });
    expect(done).toMatchObject({ status: 'done', payload: null });
    const conn = await prisma.channelConnection.findUniqueOrThrow({ where: { id: meta.connection.id } });
    expect(conn.status).toBe('active');
    const scan = await prisma.scan.findFirst({ where: { connectionId: meta.connection.id } });
    expect(scan?.orgId).toBe(orgId);
  });

  it('keeps people on an organisation number apart from everyone else', async () => {
    const shared = await prismaServices.getIdentity('whatsapp', '2348011112222', {});
    const own = await prisma.channelIdentity.findFirst({ where: { connectionId: meta.connection.id } });
    expect(own?.externalId).toBe(`c:${meta.connection.id}:2348011112222`);
    expect(own?.id).not.toBe(shared.id);
  });

  it('never exceeds the per-person limit under parallel deliveries', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const from = '2348055550000';
    for (let i = 0; i < 5; i++) await postMeta(key, metaPayload('111222333', [text(`par-${i}`, `Is this a scam? http://free-data-${i}.example`, from)]));
    const ids = (await prisma.inboundEvent.findMany({ where: { connectionId: meta.connection.id, status: 'pending' }, select: { id: true } })).map((e) => e.id);
    expect(ids).toHaveLength(5);
    await Promise.all(ids.map((id) => processInboundEvent(id)));
    const identity = await prisma.channelIdentity.findFirstOrThrow({ where: { externalId: `c:${meta.connection.id}:${from}` } });
    expect(await prisma.scan.count({ where: { identityId: identity.id } })).toBe(3);
    const replies = sent.filter((s) => JSON.parse(s.body).to === from).map((s) => JSON.parse(s.body).text.body as string);
    expect(replies).toHaveLength(5);
    expect(replies.filter((r) => r.includes('/check'))).toHaveLength(2);
  });

  it('keeps reports from organisation numbers out of community reputation', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const from = '2348066660000';
    await postMeta(key, metaPayload('111222333', [text('rep-1', 'Your account is blocked, call 09012345678 now', from)]));
    await postMeta(key, metaPayload('111222333', [text('rep-2', 'report', from)]));
    await processPendingFor(meta.connection.id);
    const reports = await prisma.report.findMany({ where: { value: '+2349012345678' } });
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r) => r.trust === 0 && r.status === 'PENDING')).toBe(true);
    expect(await prisma.indicator.findUnique({ where: { type_value: { type: 'phone', value: '+2349012345678' } } })).toBeNull();
  });

  it('continues a quiz across separate deliveries and respects the Co-pilot switch', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const from = '2348077770000';
    await postMeta(key, metaPayload('111222333', [text('q-1', 'quiz', from)]));
    await processPendingFor(meta.connection.id);
    await postMeta(key, metaPayload('111222333', [text('q-2', 'B', from)]));
    await processPendingFor(meta.connection.id);
    const bodies = sent.filter((s) => JSON.parse(s.body).to === from).map((s) => JSON.parse(s.body).text.body as string);
    expect(bodies[0]).toMatch(/Reply with A, B or C/);
    expect(bodies[1]).toMatch(/Correct|Not quite/);

    expect(await updateConnection(admin, meta.connection.id, { copilotEnabled: false })).toEqual({ ok: true });
    invalidateConnection();
    await postMeta(key, metaPayload('111222333', [text('q-3', 'How do I protect my WhatsApp?', from)]));
    await processPendingFor(meta.connection.id);
    expect(JSON.parse(sent.at(-1)!.body).text.body).toMatch(/I can check messages/);
  });

  it('downloads images through the provider', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const from = '2348088880000';
    await postMeta(key, metaPayload('111222333', [{ from, id: 'img-1', timestamp: '1', type: 'image', image: { id: 'media-1', mime_type: 'image/png' } }]));
    await processPendingFor(meta.connection.id);
    const scan = await prisma.scan.findFirst({ where: { connectionId: meta.connection.id, inputType: 'image' } });
    expect(scan).not.toBeNull();
  });

  it('maps provider errors when sending a test message', async () => {
    failNextSend = { status: 400, body: { error: { code: 131047, message: 'Re-engagement message' } } };
    expect(await sendTestMessage(admin, meta.connection.id, '2348011112222')).toMatchObject({ ok: false, code: 'provider_error', message: 'outside_window' });
    expect(await sendTestMessage(admin, meta.connection.id, '2348011112222')).toEqual({ ok: true });
  });

  it('rejects deliveries for disabled connections or when Developer Mode is off, and huge bodies', async () => {
    const key = keyOf(meta.secrets.webhookUrl);
    const body = metaPayload('111222333', [text('off-1', 'hello')]);
    await updateConnection(admin, meta.connection.id, { enabled: false });
    invalidateConnection();
    expect((await postMeta(key, body)).status).toBe(401);
    await updateConnection(admin, meta.connection.id, { enabled: true });
    await prisma.organization.update({ where: { id: orgId }, data: { developerMode: false } });
    invalidateConnection();
    expect((await postMeta(key, body)).status).toBe(401);
    await prisma.organization.update({ where: { id: orgId }, data: { developerMode: true } });
    invalidateConnection();
    const big = 'x'.repeat(1024 * 1024 + 10);
    const res = await POST(req(`https://aabo.test/api/webhooks/whatsapp/meta/${key}`, { method: 'POST', body: big, headers: { 'x-hub-signature-256': metaSign(big) } }), ctx('meta', key));
    expect(res.status).toBe(413);
  });

  it('connects Twilio and answers through its REST API', async () => {
    const res = await createConnection(admin, { provider: 'twilio', label: 'Twilio line', accountSid: ACCOUNT, number: '+2348099990000', authToken: AUTH_TOKEN });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect((await verifyConnection(admin, res.connection.id)).ok).toBe(true);
    const key = keyOf(res.secrets.webhookUrl);
    const form = new URLSearchParams({ MessageSid: 'SMin1', AccountSid: ACCOUNT, From: 'whatsapp:+2348011112222', To: 'whatsapp:+2348099990000', Body: 'Please send me the OTP code' });
    const sig = twilioSignature(res.secrets.webhookUrl, form, AUTH_TOKEN);
    const post = (signature: string) =>
      POST(req(res.secrets.webhookUrl, { method: 'POST', body: form.toString(), headers: { 'x-twilio-signature': signature, 'content-type': 'application/x-www-form-urlencoded' } }), ctx('twilio', key));
    expect((await post('bad')).status).toBe(401);
    const ok = await post(sig);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toContain('text/xml');
    await processPendingFor(res.connection.id);
    const out = sent.find((s) => s.provider === 'twilio' && s.path.endsWith('/Messages.json'));
    const params = new URLSearchParams(out!.body);
    expect(params.get('To')).toBe('whatsapp:+2348011112222');
    expect(params.get('From')).toBe('whatsapp:+2348099990000');
    expect(out!.headers.authorization).toBe(`Basic ${Buffer.from(`${ACCOUNT}:${AUTH_TOKEN}`).toString('base64')}`);
  });

  it('connects 360dialog, sets its webhook and checks the header secret', async () => {
    const res = await createConnection(admin, { provider: 'd360', label: '360 line', phoneNumberId: '444555666', apiKey: 'd360-key-123456' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const verified = await verifyConnection(admin, res.connection.id);
    expect(verified.ok).toBe(true);
    const config = sent.find((s) => s.path === '/d360/v1/configs/webhook');
    expect(JSON.parse(config!.body)).toEqual({ url: res.secrets.webhookUrl, headers: { 'x-aabo-webhook-secret': res.secrets.webhookSecret } });
    const key = keyOf(res.secrets.webhookUrl);
    const body = metaPayload('444555666', [text('d-1', 'hello')]);
    const post = (secret: string) => POST(req(res.secrets.webhookUrl, { method: 'POST', body, headers: { 'x-aabo-webhook-secret': secret } }), ctx('d360', key));
    expect((await post('nope')).status).toBe(401);
    expect((await post(res.secrets.webhookSecret!)).status).toBe(200);
    await processPendingFor(res.connection.id);
    const out = sent.find((s) => s.path === '/d360/messages');
    expect(out?.headers['d360-api-key']).toBe('d360-key-123456');
  });
});

describe('tips on organisation numbers', () => {
  it('only reach people inside the 24-hour window when the organisation allows them', async () => {
    const { actor } = await setupOrg('Tips Co');
    const res = await createConnection(actor, { provider: 'meta', label: 'Tips', phoneNumberId: '777888999', accessToken: TOKEN, appSecret: APP_SECRET });
    if (!res.ok) throw new Error('setup');
    await verifyConnection(actor, res.connection.id);
    const now = Date.now();
    const mk = (addr: string, hoursAgo: number) =>
      prisma.channelIdentity.create({
        data: { channel: 'whatsapp', externalId: `c:${res.connection.id}:${addr}`, address: addr, connectionId: res.connection.id, tipsOptIn: true, lastInboundAt: new Date(now - hoursAgo * 3_600_000) },
      });
    await mk('2348000000001', 2);
    await mk('2348000000002', 30);
    expect((await runTips({}, { gapMs: 0, now })).sent).toBe(0); // tips are off by default
    await updateConnection(actor, res.connection.id, { tipsEnabled: true });
    invalidateConnection();
    const later = now + 1000;
    const r = await runTips({}, { gapMs: 0, now: later });
    expect(r.sent).toBe(1);
    expect(sent.filter((s) => s.path.endsWith('/777888999/messages')).map((s) => JSON.parse(s.body).to)).toEqual(['2348000000001']);
    expect((await runTips({}, { gapMs: 0, now: later })).sent).toBe(0); // once a day
  });
});

describe('housekeeping', () => {
  it('counts atomically under concurrency', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimit('atomic-test', 3, 60_000)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
  });

  it('clears handled payloads and expires stuck events', async () => {
    const conn = await prisma.channelConnection.findFirstOrThrow();
    const old = await prisma.inboundEvent.create({ data: { connectionId: conn.id, providerMessageId: 'old-1', payload: '{}', createdAt: new Date(Date.now() - 2 * 86_400_000) } });
    const done = await prisma.inboundEvent.create({ data: { connectionId: conn.id, providerMessageId: 'done-1', payload: '{}', status: 'done' } });
    await runRetention();
    expect(await prisma.inboundEvent.findUnique({ where: { id: old.id } })).toMatchObject({ status: 'failed', payload: null });
    expect(await prisma.inboundEvent.findUnique({ where: { id: done.id } })).toMatchObject({ payload: null });
  });
});
