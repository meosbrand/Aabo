import { notFound } from "next/navigation";
import { DeveloperView } from "@/components/app/developer-view";
import { getDeveloperOverview } from "@/server/devmode";
import { requireOrgRole } from "@/server/org-auth";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Developer Mode settings: organisation owners and admins only (members get a 404). */
export default async function DeveloperPage() {
  const user = (await getSessionUser())!;
  const actor = await requireOrgRole(user.id, user.orgId, "admin");
  if (!actor) notFound();
  const res = await getDeveloperOverview(actor);
  if (!res.ok) notFound();
  return <DeveloperView overview={res.overview} />;
}
