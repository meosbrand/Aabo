/**
 * @fileoverview Processes webhook deliveries from organisations' own WhatsApp numbers.
 *
 * The webhook route stores each message as an InboundEvent and returns at once. Events are then
 * processed right after the response (web process) or by the sweeper (gateway process), whichever
 * claims them first. Payloads are deleted once handled and never logged.
 */

import type { CloudInbound } from '@/server/channels/cloud/types';
import { CloudWhatsAppAdapter } from '@/server/channels/cloud/adapter';
import { downloadImage } from '@/server/channels/cloud/api';
import { connectionById, type LoadedConnection } from '@/server/channels/cloud/connections';
import { prisma } from '@/server/db';
import { logError } from '@/server/log';
import type { InboundMessage } from './channels/types';
import { createPrismaServices } from './prisma-services';
import { createRouter } from './router';

const MAX_ATTEMPTS = 3;
const STALE_LOCK_MS = 2 * 60_000;

async function toMessage(conn: LoadedConnection, m: CloudInbound): Promise<InboundMessage> {
  const msg: InboundMessage = {
    channel: 'whatsapp',
    chatId: m.from,
    senderId: m.from,
    senderName: m.name,
    senderPhone: m.from.startsWith('+') ? m.from : `+${m.from}`,
    messageId: m.providerMessageId,
    timestamp: m.timestamp,
    text: m.text,
    isForwarded: m.isForwarded,
  };
  if (m.contact) msg.contact = m.contact;
  if (m.media?.kind === 'document') msg.document = { fileName: m.media.fileName ?? 'document', mime: m.media.mime };
  if (m.media?.kind === 'image') {
    const img = await downloadImage(conn, m.media.ref, m.media.mime).catch((err) => {
      logError(`media download for connection ${conn.id}`, err);
      return null;
    });
    if (img) msg.image = img;
    else if (!m.text) msg.document = { fileName: 'image', mime: m.media.mime };
  }
  return msg;
}

/** Handle one event if nobody else has claimed it. */
export async function processInboundEvent(eventId: string): Promise<void> {
  const claimed = await prisma.inboundEvent.updateMany({
    where: { id: eventId, status: 'pending' },
    data: { status: 'processing', lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return;
  const event = await prisma.inboundEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  try {
    const conn = await connectionById(event.connectionId);
    if (!conn || !conn.enabled || !conn.orgDeveloperMode || !event.payload) {
      await prisma.inboundEvent.update({ where: { id: eventId }, data: { status: 'skipped', payload: null, lockedAt: null, processedAt: new Date() } });
      return;
    }
    const inbound = JSON.parse(event.payload) as CloudInbound;
    const services = createPrismaServices({
      kind: 'connection',
      connectionId: conn.id,
      orgId: conn.orgId,
      dailyLimitPerUser: conn.dailyLimitPerUser,
      orgDailyCap: conn.orgDailyCap,
      copilotEnabled: conn.copilotEnabled,
    });
    const router = createRouter(services, { typingDelayMs: 0 });
    await router.handle(await toMessage(conn, inbound), new CloudWhatsAppAdapter(conn, inbound.providerMessageId));
    await prisma.inboundEvent.update({ where: { id: eventId }, data: { status: 'done', payload: null, lockedAt: null, error: null, processedAt: new Date() } });
  } catch (err) {
    logError(`inbound event ${eventId}`, err);
    const giveUp = event.attempts >= MAX_ATTEMPTS;
    await prisma.inboundEvent
      .update({
        where: { id: eventId },
        data: { status: giveUp ? 'failed' : 'pending', lockedAt: null, error: (err as { code?: string }).code ?? 'error', ...(giveUp ? { payload: null, processedAt: new Date() } : {}) },
      })
      .catch(() => undefined);
  }
}

/** Process waiting events for one connection, oldest first. */
export async function processPendingFor(connectionId: string, max = 20): Promise<void> {
  const events = await prisma.inboundEvent.findMany({ where: { connectionId, status: 'pending' }, orderBy: { createdAt: 'asc' }, take: max, select: { id: true } });
  for (const e of events) await processInboundEvent(e.id);
}

/** Gateway loop: retries stuck events and processes anything the web process did not. */
export class InboundSweeper {
  private timer: NodeJS.Timeout | null = null;
  private busy = false;

  start(intervalMs = 2000): void {
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const stale = new Date(Date.now() - STALE_LOCK_MS);
      await prisma.inboundEvent.updateMany({ where: { status: 'processing', lockedAt: { lt: stale }, attempts: { lt: MAX_ATTEMPTS } }, data: { status: 'pending', lockedAt: null } });
      await prisma.inboundEvent.updateMany({
        where: { status: 'processing', lockedAt: { lt: stale }, attempts: { gte: MAX_ATTEMPTS } },
        data: { status: 'failed', payload: null, lockedAt: null, processedAt: new Date() },
      });
      const events = await prisma.inboundEvent.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 20, select: { id: true } });
      for (const e of events) await processInboundEvent(e.id);
    } catch (err) {
      logError('inbound sweeper', err);
    } finally {
      this.busy = false;
    }
  }
}
