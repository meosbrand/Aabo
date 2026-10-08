/**
 * Webhooks for organisations' own WhatsApp numbers (Developer Mode):
 *   /api/webhooks/whatsapp/meta/<key>     Meta WhatsApp Cloud API (GET verify + POST events)
 *   /api/webhooks/whatsapp/twilio/<key>   Twilio WhatsApp
 *   /api/webhooks/whatsapp/d360/<key>     360dialog
 * Every request is authenticated against the connection's own secret before anything is written;
 * unknown keys, wrong providers and disabled connections all get the same 401. Authenticated
 * deliveries are rate-limited per connection. Messages are queued and answered right after the
 * response. Payloads are never logged.
 */

import { Prisma } from '@prisma/client';
import { after, NextResponse } from 'next/server';
import { processPendingFor } from '@/gateway/inbound';
import { connectionByKey, webhookUrl, type LoadedConnection } from '@/server/channels/cloud/connections';
import { parseCloudPayload, parseTwilioForm, type ParsedWebhook } from '@/server/channels/cloud/parse';
import { matchesSecretHash, verifyMetaSignature, verifyTwilioSignature } from '@/server/channels/cloud/signature';
import { CLOUD_PROVIDERS, type CloudProvider, type MetaCredentials, type TwilioCredentials } from '@/server/channels/cloud/types';
import { prisma } from '@/server/db';
import { logError } from '@/server/log';
import { rateLimit } from '@/server/rate-limit-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 1024 * 1024;
/** Deliveries per connection per minute (providers batch, so this is generous). */
const PER_CONNECTION_PER_MINUTE = 600;

type Params = { params: Promise<{ provider: string; key: string }> };

const unauthorized = () => new NextResponse('unauthorized', { status: 401 });

/** Cheap checks only (format, cached lookup): nothing is written for unauthenticated requests. */
async function gate(provider: string, key: string): Promise<LoadedConnection | Response> {
  if (!(CLOUD_PROVIDERS as string[]).includes(provider) || !/^[A-Za-z0-9_-]{20,64}$/.test(key)) return unauthorized();
  const conn = await connectionByKey(key);
  if (!conn || conn.provider !== (provider as CloudProvider) || !conn.enabled || !conn.orgDeveloperMode) return unauthorized();
  return conn;
}

/** Meta's subscription handshake. */
export async function GET(req: Request, { params }: Params) {
  const { provider, key } = await params;
  const conn = await gate(provider, key);
  if (conn instanceof Response) return conn;
  if (conn.provider !== 'meta') return unauthorized();
  const q = new URL(req.url).searchParams;
  if (q.get('hub.mode') === 'subscribe' && matchesSecretHash(q.get('hub.verify_token'), conn.inboundSecretHash)) {
    return new NextResponse(q.get('hub.challenge') ?? '', { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(req: Request, { params }: Params) {
  const { provider, key } = await params;
  const conn = await gate(provider, key);
  if (conn instanceof Response) return conn;
  if (Number(req.headers.get('content-length') ?? '0') > MAX_BODY) return new NextResponse('payload too large', { status: 413 });
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > MAX_BODY) return new NextResponse('payload too large', { status: 413 });

  let parsed: ParsedWebhook;
  if (conn.provider === 'twilio') {
    const form = new URLSearchParams(raw.toString('utf8'));
    const creds = conn.credentials as TwilioCredentials;
    if (!verifyTwilioSignature(webhookUrl('twilio', key), form, req.headers.get('x-twilio-signature'), creds.authToken)) return unauthorized();
    parsed = parseTwilioForm(form, { accountSid: conn.config.accountSid ?? '', number: conn.externalNumberId });
  } else {
    const ok =
      conn.provider === 'meta'
        ? verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), (conn.credentials as MetaCredentials).appSecret)
        : matchesSecretHash(req.headers.get('x-aabo-webhook-secret'), conn.inboundSecretHash);
    if (!ok) return unauthorized();
    let body: unknown;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      return new NextResponse('bad request', { status: 400 });
    }
    parsed = parseCloudPayload(body, conn.externalNumberId);
  }

  const limit = await rateLimit(`wh:conn:${conn.id}`, PER_CONNECTION_PER_MINUTE, 60_000);
  if (!limit.ok) return new NextResponse('too many requests', { status: 429 });

  const ack = conn.provider === 'twilio' ? new NextResponse('<Response/>', { status: 200, headers: { 'content-type': 'text/xml' } }) : NextResponse.json({ ok: true });
  // Only connections whose credentials were verified take messages.
  if (!['verified', 'active'].includes(conn.status) || !parsed.messages.length) return ack;

  let queued = 0;
  for (const m of parsed.messages) {
    try {
      await prisma.inboundEvent.create({ data: { connectionId: conn.id, providerMessageId: m.providerMessageId.slice(0, 200), payload: JSON.stringify(m) } });
      queued++;
    } catch (err) {
      // Providers retry deliveries: an existing id is a duplicate.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
  }
  await prisma.channelConnection.update({ where: { id: conn.id }, data: { lastInboundAt: new Date(), status: 'active', lastError: null } });
  if (queued && process.env.AABO_WEBHOOK_INLINE !== '0') {
    after(() => processPendingFor(conn.id).catch((err) => logError('webhook processing', err)));
  }
  return ack;
}
