/**
 * Web Push (VAPID) for Guardian alerts in the installed PWA. No-op when keys are not configured.
 */

import webpush from 'web-push';
import { prisma } from './db';

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:security@example.com', pub!, priv!);
  return configured;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!ensureConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
        .catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 404 || err.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        }),
    ),
  );
}
