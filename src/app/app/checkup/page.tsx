import { CheckupList } from "@/components/app/checkup-list";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function CheckupPage() {
  const user = (await getSessionUser())!;
  const answers = await prisma.checkupAnswer.findMany({ where: { userId: user.id, done: true }, select: { itemId: true } });
  return <CheckupList done={answers.map((a) => a.itemId)} />;
}
