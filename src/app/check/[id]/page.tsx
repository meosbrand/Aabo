import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { VerdictCard } from "@/components/verdict-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db";
import { verdictFromScan } from "@/server/verdict-from-scan";

export const dynamic = "force-dynamic";

export default async function ScanResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) notFound();
  const seenCount = await prisma.scan.count({ where: { contentHash: scan.contentHash, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {scan.excerpt && (
          <blockquote className="whitespace-pre-wrap break-words rounded-lg border-l-4 border-primary bg-card p-3 text-sm text-muted-foreground">
            {scan.excerpt}
          </blockquote>
        )}
        <VerdictCard verdict={verdictFromScan(scan)} scanId={scan.id} seenCount={seenCount} />
        <Button asChild variant="outline" className="w-full">
          <Link href="/check">Check another message</Link>
        </Button>
      </main>
    </>
  );
}
