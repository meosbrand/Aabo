import { tipOfTheDay } from "@/core/awareness/content";
import { DashboardView } from "@/components/app/dashboard-view";
import { prisma } from "@/server/db";
import { protectionFor } from "@/server/protection";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const scope = user.orgId ? { OR: [{ orgId: user.orgId }, { userId: user.id }] } : { userId: user.id };

  const [scans, flagged, dangerous, alerts, recentScans, guardian, protection] = await Promise.all([
    prisma.scan.count({ where: { ...scope, createdAt: { gte: since } } }),
    prisma.scan.count({ where: { ...scope, createdAt: { gte: since }, level: { in: ["LIKELY_SCAM", "DANGEROUS"] } } }),
    prisma.scan.count({ where: { ...scope, createdAt: { gte: since }, level: "DANGEROUS" } }),
    prisma.alert.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.scan.findMany({
      where: { ...scope, channel: { not: "guardian" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, level: true, category: true, excerpt: true, channel: true, createdAt: true },
    }),
    prisma.waSession.findFirst({ where: { kind: "GUARDIAN", ownerUserId: user.id }, select: { status: true, phone: true, desiredState: true } }),
    protectionFor(user.id),
  ]);

  return (
    <DashboardView
      name={user.name.split(" ")[0]}
      stats={{ scans, flagged, dangerous }}
      protection={protection}
      guardian={guardian ? { connected: guardian.status === "connected" && guardian.desiredState === "running", phone: guardian.phone } : null}
      alerts={alerts.map((a) => ({ id: a.id, level: a.level, category: a.category, sender: a.sender, summary: a.summary, createdAt: a.createdAt.toISOString(), unread: !a.readAt }))}
      recentScans={recentScans.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
      tip={tipOfTheDay()}
    />
  );
}
