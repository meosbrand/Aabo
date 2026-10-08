import { GuardianPanel } from "@/components/app/guardian-panel";
import { getGuardianStatus } from "@/app/app/actions";

export const dynamic = "force-dynamic";

export default async function GuardianPage() {
  const status = await getGuardianStatus();
  return <GuardianPanel initial={status} />;
}
