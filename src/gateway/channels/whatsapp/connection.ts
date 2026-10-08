/**
 * One WhatsApp linked-device connection (a WaSession row): connect, pair (QR or phone
 * pairing code), reconnect with backoff, and expose send/typing for the router.
 * Behaviour is deliberately quiet to limit ban risk: no online presence on connect,
 * no read receipts, no history sync, replies only.
 */

import type { WASocket, WAMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { prisma } from '@/server/db';
import type { ChannelAdapter, InboundMessage } from '../types';
import { clearAuthState, loadPrismaAuthState } from './auth-state';
import { loadBaileys, type Baileys } from './baileys';
import { toInbound } from './message';

export interface ConnectionHandlers {
  onMessage: (msg: InboundMessage, raw: WAMessage, conn: WaConnection) => Promise<void>;
  /** Process messages the account itself sent (Guardian ignores them; bot ignores them). */
  includeFromMe?: boolean;
  downloadImages: boolean;
  label: string;
}

const MAX_PAIRING_ATTEMPTS = 4;
/** Baileys can sit in "connecting" forever when WhatsApp is unreachable; give up and retry. */
const CONNECT_WATCHDOG_MS = 45_000;
const logger = pino({ level: process.env.WA_LOG_LEVEL ?? 'warn' });

export class WaConnection implements ChannelAdapter {
  readonly name = 'whatsapp' as const;
  sock: WASocket | null = null;
  private b: Baileys | null = null;
  private stopped = false;
  private retries = 0;
  private pairingRequested = false;
  private unregisteredAttempts = 0;

  constructor(
    readonly sessionId: string,
    private readonly phone: string | null,
    private readonly handlers: ConnectionHandlers,
  ) {}

  get label(): string {
    return this.handlers.label;
  }

  /** The account's own JID ("Message yourself" chat). */
  get ownJid(): string | null {
    if (!this.sock?.user?.id || !this.b) return null;
    return this.b.jidNormalizedUser(this.sock.user.id);
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.b ??= await loadBaileys();
    await this.connect();
  }

  private async setStatus(data: { status?: string; qr?: string | null; pairingCode?: string | null; lastError?: string | null; phone?: string | null; desiredState?: string }) {
    await prisma.waSession.update({ where: { id: this.sessionId }, data: { ...data, lastSeenAt: new Date() } }).catch(() => undefined);
  }

  private async connect(): Promise<void> {
    const b = this.b!;
    const { state, saveCreds } = await loadPrismaAuthState(this.sessionId, b);
    const { version } = await b.fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
    const sock = b.makeWASocket({
      version,
      auth: state,
      logger,
      browser: b.Browsers.ubuntu('Ààbò'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
    });
    this.sock = sock;
    this.pairingRequested = false;
    let reachedServer = false;
    sock.ev.on('creds.update', saveCreds);
    await this.setStatus({ status: 'connecting' });
    const watchdog = setTimeout(() => {
      if (reachedServer || this.stopped) return;
      console.warn(`[aabo] ${this.handlers.label}: cannot reach WhatsApp servers, retrying`);
      void this.setStatus({ status: 'disconnected', lastError: 'Cannot reach WhatsApp servers (network). Retrying…' });
      sock.end(new Error('connect timeout'));
    }, CONNECT_WATCHDOG_MS);

    sock.ev.on('connection.update', async (u) => {
      if (u.qr || u.connection === 'open') {
        reachedServer = true;
        clearTimeout(watchdog);
      }
      if (u.qr && !state.creds.registered) {
        if (this.phone && !this.pairingRequested) {
          this.pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(this.phone.replace(/\D/g, ''));
            const pretty = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
            console.log(`[aabo] ${this.handlers.label}: pairing code for ${this.phone}: ${pretty}`);
            await this.setStatus({ status: 'pairing', pairingCode: pretty, qr: u.qr });
          } catch (err) {
            await this.setStatus({ status: 'qr', qr: u.qr, lastError: `Pairing code failed: ${(err as Error).message}` });
          }
        } else if (!this.phone) {
          console.log(`[aabo] ${this.handlers.label}: scan this QR in WhatsApp › Linked devices:\n${await QRCode.toString(u.qr, { type: 'terminal', small: true })}`);
          await this.setStatus({ status: 'qr', qr: u.qr });
        } else {
          await this.setStatus({ qr: u.qr });
        }
      }

      if (u.connection === 'open') {
        this.retries = 0;
        this.unregisteredAttempts = 0;
        const phone = sock.user?.id ? `+${b.jidDecode(sock.user.id)?.user ?? ''}` : null;
        console.log(`[aabo] ${this.handlers.label}: connected as ${phone}`);
        await this.setStatus({ status: 'connected', qr: null, pairingCode: null, lastError: null, phone });
      }

      if (u.connection === 'close') {
        clearTimeout(watchdog);
        const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        if (this.stopped) return;
        if (code === b.DisconnectReason.loggedOut) {
          console.log(`[aabo] ${this.handlers.label}: logged out from the phone`);
          await clearAuthState(this.sessionId);
          await this.setStatus({ status: 'logged_out', qr: null, pairingCode: null, desiredState: 'stopped' });
          this.stopped = true;
          return;
        }
        if (reachedServer && !state.creds.registered && ++this.unregisteredAttempts >= MAX_PAIRING_ATTEMPTS) {
          await this.setStatus({ status: 'error', lastError: 'Linking timed out. Start again from the Ààbò app.', qr: null, pairingCode: null, desiredState: 'stopped' });
          this.stopped = true;
          return;
        }
        const restart = code === b.DisconnectReason.restartRequired;
        const delay = restart ? 500 : Math.min(60_000, 2000 * 2 ** this.retries++);
        if (reachedServer) await this.setStatus({ status: 'disconnected', lastError: code ? `Disconnected (${code})` : 'Disconnected' });
        setTimeout(() => {
          if (!this.stopped) this.connect().catch((err) => console.error(`[aabo] ${this.handlers.label}: reconnect failed`, err));
        }, delay);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        if (m.key.fromMe && !this.handlers.includeFromMe) continue;
        try {
          const msg = await toInbound(b, sock, m, { downloadImages: this.handlers.downloadImages });
          if (msg) await this.handlers.onMessage(msg, m, this);
        } catch (err) {
          console.error(`[aabo] ${this.handlers.label}: message handling failed`, (err as Error).message);
        }
      }
    });
  }

  async send(chatId: string, text: string): Promise<void> {
    if (!this.sock) throw new Error('WhatsApp not connected');
    await this.sock.sendMessage(chatId, { text });
  }

  async typing(chatId: string): Promise<void> {
    await this.sock?.sendPresenceUpdate('composing', chatId).catch(() => undefined);
  }

  /** Router adapter interface (onMessage is wired by the session manager instead). */
  async stop(): Promise<void> {
    this.stopped = true;
    this.sock?.end(undefined);
    this.sock = null;
  }

  async logout(): Promise<void> {
    this.stopped = true;
    await this.sock?.logout().catch(() => undefined);
    this.sock = null;
    await clearAuthState(this.sessionId);
  }
}
