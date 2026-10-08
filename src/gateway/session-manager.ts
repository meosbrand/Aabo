/**
 * @fileoverview Keeps WhatsApp linked-device sessions in line with the database:
 * the shared Ààbò BOT number plus one GUARDIAN session per user who linked their WhatsApp.
 * The web app only writes WaSession.desiredState; this loop does the rest.
 */

import { prisma } from '@/server/db';
import { WaConnection } from './channels/whatsapp/connection';
import { GuardianHost } from './guardian';
import type { Router } from './router';

const POLL_MS = 3000;

export class SessionManager {
  private conns = new Map<string, WaConnection>();
  private timer: NodeJS.Timeout | null = null;
  private guardian = new GuardianHost();
  private busy = false;

  constructor(private readonly router: Router) {}

  async start(): Promise<void> {
    if (process.env.WA_BOT_ENABLED !== '0') await this.ensureBotSession();
    await this.reconcile();
    this.timer = setInterval(() => this.reconcile().catch((e) => console.error('[aabo] reconcile failed', e)), POLL_MS);
  }

  /** The shared bot connection (for scheduled tips), if connected. */
  botConnection(): WaConnection | null {
    for (const conn of this.conns.values()) if (conn.label === 'bot' && conn.ownJid) return conn;
    return null;
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await Promise.all([...this.conns.values()].map((c) => c.stop()));
    this.conns.clear();
  }

  private async ensureBotSession() {
    const phone = process.env.WA_BOT_PHONE?.replace(/\D/g, '') || null;
    const existing = await prisma.waSession.findFirst({ where: { kind: 'BOT' } });
    if (!existing) {
      await prisma.waSession.create({ data: { kind: 'BOT', phone: phone ? `+${phone}` : null, desiredState: 'running' } });
    } else if (existing.desiredState !== 'running' && existing.status !== 'logged_out') {
      await prisma.waSession.update({ where: { id: existing.id }, data: { desiredState: 'running' } });
    }
  }

  private async reconcile() {
    if (this.busy) return;
    this.busy = true;
    try {
      const rows = await prisma.waSession.findMany();
      for (const row of rows) {
        const conn = this.conns.get(row.id);
        if (row.desiredState === 'running' && !conn) {
          await this.open(row);
        } else if (row.desiredState === 'stopped' && conn) {
          await conn.stop();
          this.conns.delete(row.id);
          await prisma.waSession.update({ where: { id: row.id }, data: { status: 'disconnected' } });
        } else if (row.desiredState === 'logout') {
          if (conn) await conn.logout();
          this.conns.delete(row.id);
          await prisma.waSession.update({ where: { id: row.id }, data: { status: 'logged_out', desiredState: 'stopped', qr: null, pairingCode: null } });
        }
      }
      // Sessions deleted from the database: drop their sockets too.
      for (const [id, conn] of this.conns) {
        if (!rows.some((r) => r.id === id)) {
          await conn.stop();
          this.conns.delete(id);
        }
      }
    } finally {
      this.busy = false;
    }
  }

  private async open(row: { id: string; kind: string; phone: string | null; ownerUserId: string | null; scanGroups: boolean }) {
    let conn: WaConnection;
    if (row.kind === 'BOT') {
      conn = new WaConnection(row.id, row.phone, {
        label: 'bot',
        downloadImages: true,
        onMessage: async (msg, _raw, c) => this.router.handle(msg, c),
      });
    } else {
      if (!row.ownerUserId) return;
      const owner = { userId: row.ownerUserId, sessionId: row.id, scanGroups: row.scanGroups };
      conn = new WaConnection(row.id, row.phone, {
        label: `guardian:${row.id.slice(-6)}`,
        downloadImages: false,
        onMessage: async (msg, _raw, c) => {
          const self = c.ownJid;
          if (!self || msg.chatId === self) return;
          const fresh = await prisma.waSession.findUnique({ where: { id: row.id }, select: { scanGroups: true } });
          await this.guardian.handle({ ...owner, scanGroups: fresh?.scanGroups ?? false }, msg, {
            notifyOwner: (text) => c.send(self, text),
          });
        },
      });
    }
    this.conns.set(row.id, conn);
    await prisma.waSession.update({ where: { id: row.id }, data: { status: 'pending', lastError: null } });
    conn.start().catch(async (err) => {
      console.error(`[aabo] session ${row.id} failed to start`, err);
      this.conns.delete(row.id);
      await prisma.waSession.update({ where: { id: row.id }, data: { status: 'error', lastError: (err as Error).message, desiredState: 'stopped' } });
    });
  }
}
