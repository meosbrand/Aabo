import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { LESSONS } from "@/core/awareness/content";
import { LessonView } from "@/components/learn/lesson-view";
import { getSessionUser } from "@/server/session";

export default async function PublicLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!LESSONS.some((l) => l.id === id)) notFound();
  const user = await getSessionUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <LessonView lessonId={id} basePath="/learn" signedIn={Boolean(user)} />
      </main>
    </>
  );
}
