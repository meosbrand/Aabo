/**
 * Ààbò messaging gateway — a long-running process next to the web app.
 *   npm run gateway
 * Channels: WhatsApp linked device (Baileys: shared bot number + Guardian sessions) and Telegram.
 * It also retries webhook deliveries for organisations' own WhatsApp numbers (Developer Mode).
 */

import 'dotenv/config';
import { prisma } from '@/server/db';
import { TelegramAdapter } from './channels/telegram/adapter';
import { prismaServices } from './prisma-services';
import { InboundSweeper } from './inbound';
import { createRouter } from './router';
import { SessionManager } from './session-manager';
import { startTipScheduler } from './tips';
import { runRetention } from '@/server/retention';
import { secretsAvailable } from '@/server/secrets/crypto';

async function main() {
  if ((process.env.DATABASE_URL ?? '').startsWith('file:')) {
    // WAL lets the web app and the gateway share one SQLite file safely.
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => undefined);
  }

  const router = createRouter(prismaServices);
  const stops: Array<() => Promise<void> | void> = [];

  let telegram: TelegramAdapter | null = null;
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegram = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN);
    await telegram.start((msg) => router.handle(msg, telegram!));
    stops.push(() => telegram!.stop());
  } else {
    console.log('[aabo] telegram: disabled (set TELEGRAM_BOT_TOKEN to enable)');
  }

  let manager: SessionManager | null = null;
  const transport = process.env.WHATSAPP_TRANSPORT ?? 'baileys';
  if (transport === 'baileys') {
    manager = new SessionManager(router);
    await manager.start();
    stops.push(() => manager!.stop());
    console.log('[aabo] whatsapp: linked-device sessions running');
  } else {
    console.log('[aabo] whatsapp: disabled');
  }

  // Organisations' own WhatsApp numbers (official APIs) arrive by webhook; this retries stragglers.
  const sweeper = new InboundSweeper();
  sweeper.start();
  stops.push(() => sweeper.stop());
  if (!secretsAvailable()) console.log('[aabo] developer mode: AABO_SECRET_KEYS is not set, so organisations cannot connect their own keys or numbers');

  stops.push(
    startTipScheduler({
      telegram: () => telegram,
      whatsapp: () => manager?.botConnection() ?? null,
    }),
  );

  // Daily data-retention sweep (message excerpts, old scans, expired caches).
  const retention = setInterval(() => runRetention().catch((e) => console.error('[aabo] retention failed', e)), 24 * 3_600_000);
  runRetention().catch(() => undefined);
  stops.push(() => clearInterval(retention));

  const shutdown = async () => {
    console.log('[aabo] shutting down…');
    for (const stop of stops.reverse()) await stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[aabo] gateway failed to start', err);
  process.exit(1);
});
