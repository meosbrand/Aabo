import { PanicView } from "@/components/app/panic-view";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function PanicPage() {
  const user = (await getSessionUser())!;
  const contacts = await prisma.emergencyContact.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return <PanicView contacts={contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))} userName={user.name} />;
}
