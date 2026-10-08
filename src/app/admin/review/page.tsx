import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ReviewQueue } from "@/components/app/review-queue";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!user || !["admin", "reviewer"].includes(user.role)) notFound();

  const groups = await prisma.report.groupBy({
    by: ["type", "value"],
    where: { status: "PENDING", type: { not: "message" } },
    _count: true,
    _max: { createdAt: true },
    orderBy: { _count: { type: "desc" } },
    take: 50,
  });
  const items = await Promise.all(
    groups.map(async (g) => {
      const latest = await prisma.report.findFirst({ where: { type: g.type, value: g.value, status: "PENDING" }, orderBy: { createdAt: "desc" } });
      const scan = latest?.scanId ? await prisma.scan.findUnique({ where: { id: latest.scanId }, select: { excerpt: true, level: true, category: true } }) : null;
      const votes = await prisma.reviewVote.findMany({ where: { report: { type: g.type, value: g.value } }, select: { vote: true } });
      return {
        type: g.type,
        value: g.value,
        reports: g._count,
        last: g._max.createdAt?.toISOString() ?? "",
        category: latest?.category ?? scan?.category ?? null,
        note: latest?.note ?? null,
        excerpt: scan?.excerpt ?? latest?.excerpt ?? null,
        level: scan?.level ?? null,
        confirms: votes.filter((v) => v.vote === "confirm").length,
        rejects: votes.filter((v) => v.vote === "reject").length,
      };
    }),
  );
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <ReviewQueue items={items} role={user.role} />
      </main>
    </>
  );
}
