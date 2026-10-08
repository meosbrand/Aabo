"use client";

import Link from "next/link";
import { CheckCircle2, Clock, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/LanguageContext";
import { LESSONS, tipOfTheDay } from "@/core/awareness/content";
import { L, tr } from "@/lib/i18n";

const T = {
  title: L("Learn to spot scams", "Learn how to catch scam"),
  sub: L("Short lessons on the scams hitting Nigerian businesses right now. 2–4 minutes each.", "Short lessons about the scams wey dey hit Nigerian business now. 2–4 minutes each."),
  progress: L("lessons completed", "lessons wey you don finish"),
  min: L("min", "min"),
  tip: L("Tip of the day", "Tip of the day"),
};

/** Lesson index. `basePath` is /learn (public) or /app/learn (with progress). */
export function LessonList({ basePath, completed }: { basePath: string; completed?: string[] }) {
  const { language } = useLanguage();
  const done = new Set(completed ?? []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <GraduationCap className="text-primary" /> {tr(language, T.title)}
        </h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>
      {completed && (
        <div className="space-y-1">
          <Progress value={(done.size / LESSONS.length) * 100} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {done.size}/{LESSONS.length} {tr(language, T.progress)}
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {LESSONS.map((l) => (
          <Link key={l.id} href={`${basePath}/${l.id}`}>
            <Card className="h-full transition hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  {tr(language, l.title)}
                  {done.has(l.id) && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {l.minutes} {tr(language, T.min)}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="border-accent bg-accent/20">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold">💡 {tr(language, T.tip)}</p>
          <p>{tr(language, tipOfTheDay())}</p>
        </CardContent>
      </Card>
    </div>
  );
}
