import { ProfileForm } from "@/components/app/profile-form";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = (await getSessionUser())!;
  const row = await prisma.user.findUnique({ where: { id: user.id } });
  return (
    <ProfileForm
      name={row?.name ?? ""}
      email={row?.email ?? ""}
      businessName={row?.businessName ?? ""}
      phone={row?.phone ?? null}
      createdAt={row?.createdAt.toISOString() ?? new Date().toISOString()}
    />
  );
}
