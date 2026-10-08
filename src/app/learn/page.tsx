import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LessonList } from "@/components/learn/lesson-list";

export const metadata: Metadata = {
  title: "Learn to spot Nigerian scams — Ààbò",
  description: "Free 2-minute lessons on WhatsApp hijacking, fake alerts, supplier account changes, BVN/EFCC impersonation, Ponzi schemes and job scams.",
};

export default function LearnPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <LessonList basePath="/learn" />
      </main>
    </>
  );
}
