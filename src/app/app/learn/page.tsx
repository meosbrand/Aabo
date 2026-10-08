import { LessonList } from "@/components/learn/lesson-list";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AppLearnPage() {
  const user = (await getSessionUser())!;
  const done = await prisma.lessonProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } });
  return <LessonList basePath="/app/learn" completed={done.map((d) => d.lessonId)} />;
}
