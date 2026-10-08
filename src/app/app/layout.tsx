import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Signed-in area: verifies the session on the server and renders the app shell. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [row, unreadAlerts] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { businessName: true } }),
    prisma.alert.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role, orgRole: user.orgRole, businessName: row?.businessName ?? null, unreadAlerts }}>
      {children}
    </AppShell>
  );
}
