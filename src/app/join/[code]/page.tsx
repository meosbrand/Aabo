import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { JoinTeam } from "@/components/app/join-team";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?mode=signup&next=${encodeURIComponent(`/join/${code}`)}`);
  return <JoinTeam code={code} />;
}
