import { TeamView } from "@/components/app/team-view";
import { LESSONS } from "@/core/awareness/content";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = (await getSessionUser())!;
  if (!user.orgId) return <TeamView orgName="" isOwner={false} members={[]} feed={[]} appUrl="" lessonCount={LESSONS.length} />;
  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } } },
  });
  const memberIds = org?.members.map((m) => m.userId) ?? [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [lessons, guardians, scans, feed] = await Promise.all([
    prisma.lessonProgress.groupBy({ by: ["userId"], where: { userId: { in: memberIds } }, _count: true }),
    prisma.waSession.findMany({ where: { kind: "GUARDIAN", ownerUserId: { in: memberIds }, status: "connected", desiredState: "running" }, select: { ownerUserId: true } }),
    prisma.scan.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, createdAt: { gte: since }, level: { in: ["LIKELY_SCAM", "DANGEROUS"] } }, _count: true }),
    prisma.scan.findMany({
      where: { OR: [{ orgId: user.orgId }, { userId: { in: memberIds } }], level: { in: ["LIKELY_SCAM", "DANGEROUS"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, level: true, category: true, channel: true, userId: true, createdAt: true },
    }),
  ]);
  const me = org?.members.find((m) => m.userId === user.id);
  const nameOf = (id: string | null) => org?.members.find((m) => m.userId === id)?.user.name ?? "—";
  return (
    <TeamView
      orgName={org?.name ?? ""}
      isOwner={me?.role === "owner" || me?.role === "admin"}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
      lessonCount={LESSONS.length}
      members={(org?.members ?? []).map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        lessons: lessons.find((l) => l.userId === m.userId)?._count ?? 0,
        guardian: guardians.some((g) => g.ownerUserId === m.userId),
        caught: scans.find((s) => s.userId === m.userId)?._count ?? 0,
      }))}
      feed={feed.map((f) => ({ id: f.id, level: f.level, category: f.category, channel: f.channel, who: nameOf(f.userId), createdAt: f.createdAt.toISOString() }))}
    />
  );
}
