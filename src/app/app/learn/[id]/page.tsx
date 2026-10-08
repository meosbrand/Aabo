import { notFound } from "next/navigation";
import { LESSONS } from "@/core/awareness/content";
import { LessonView } from "@/components/learn/lesson-view";

export default async function AppLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!LESSONS.some((l) => l.id === id)) notFound();
  return <LessonView lessonId={id} basePath="/app/learn" signedIn />;
}
