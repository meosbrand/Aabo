import { SettingsView } from "@/components/app/settings-view";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  const [row, keys, chats] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { language: true, alertThreshold: true } }),
    prisma.apiKey.findMany({ where: { userId: user.id, revokedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true } }),
    prisma.channelIdentity.findMany({ where: { userId: user.id }, select: { id: true, channel: true, displayName: true, phone: true } }),
  ]);
  return (
    <SettingsView
      language={(row?.language as "en" | "pidgin") ?? "en"}
      alertThreshold={row?.alertThreshold ?? "SUSPICIOUS"}
      apiKeys={keys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt?.toISOString() ?? null }))}
      chats={chats}
      vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      botNumber={process.env.NEXT_PUBLIC_WA_BOT_NUMBER ?? null}
      telegramBot={process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? null}
    />
  );
}
