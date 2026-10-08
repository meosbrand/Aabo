import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { JoinTeam } from "@/components/app/join-team";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?mode=signup&next=${encodeURIComponent(`/join/${code}`)}`);
  const invite = await prisma.invite.findUnique({ where: { code }, include: { org: { select: { name: true } } } });
  const valid = Boolean(invite && invite.expiresAt > new Date());
  return <JoinTeam code={code} orgName={valid ? invite!.org.name : null} valid={valid} />;
}
