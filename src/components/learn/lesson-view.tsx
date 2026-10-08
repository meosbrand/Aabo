"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { findQuiz, LESSONS } from "@/core/awareness/content";
import { L, tr } from "@/lib/i18n";
import { completeLesson } from "@/app/app/learn/actions";

const T = {
  quiz: L("Quick check", "Quick test"),
  finish: L("Finish lesson", "Finish lesson"),
  done: L("Lesson complete — well done! 🎉", "You don finish the lesson — well done! 🎉"),
  signIn: L("Sign in to save your progress and raise your protection score.", "Sign in make we save your progress and raise your protection score."),
  back: L("All lessons", "All lessons"),
  share: L("Share this lesson on WhatsApp", "Share this lesson for WhatsApp"),
};

const LETTERS = ["A", "B", "C"];

export function LessonView({ lessonId, basePath, signedIn }: { lessonId: string; basePath: string; signedIn: boolean }) {
  const { language } = useLanguage();
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  const quizzes = lesson.quizIds.map(findQuiz).filter((q): q is NonNullable<typeof q> => Boolean(q));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [pending, start] = useTransition();
  const allAnswered = quizzes.every((q) => answers[q.id] !== undefined);
  const correct = quizzes.filter((q) => answers[q.id] === q.answer).length;
  const shareText = `${tr(language, lesson.title)}\n\n${lesson.points.map((p) => `• ${tr(language, p)}`).join("\n")}\n\n— Ààbò 🛡️`;

  return (
    <div className="space-y-6">
      <Link href={basePath} className="text-sm text-primary hover:underline">
        ← {tr(language, T.back)}
      </Link>
      <h1 className="text-3xl font-bold">{tr(language, lesson.title)}</h1>
      <Card>
        <CardContent className="space-y-3 p-5">
          {lesson.points.map((p, i) => (
            <p key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <span>{tr(language, p)}</span>
            </p>
          ))}
          <Button asChild variant="outline" size="sm" className="mt-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
              {tr(language, T.share)}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🧠 {tr(language, T.quiz)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {quizzes.map((q) => {
            const chosen = answers[q.id];
            return (
              <div key={q.id} className="space-y-2" data-testid="quiz-question">
                <p className="font-medium">{tr(language, q.question)}</p>
                <div className="grid gap-2">
                  {q.options.map((o, i) => {
                    const isChosen = chosen === i;
                    const show = chosen !== undefined;
                    const right = i === q.answer;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={show}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                        className={`flex items-center gap-2 rounded-md border p-3 text-left text-sm transition ${
                          show && right ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : show && isChosen ? "border-red-400 bg-red-50 dark:bg-red-950/30" : "hover:bg-secondary"
                        }`}
                      >
                        <span className="font-bold">{LETTERS[i]}.</span> {tr(language, o)}
                        {show && right && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />}
                        {show && isChosen && !right && <XCircle className="ml-auto h-4 w-4 text-red-500" />}
                      </button>
                    );
                  })}
                </div>
                {chosen !== undefined && <p className="text-sm text-muted-foreground">{tr(language, q.explanation)}</p>}
              </div>
            );
          })}
          {finished ? (
            <p className="font-semibold text-emerald-700" data-testid="lesson-done">
              {tr(language, T.done)} ({correct}/{quizzes.length})
            </p>
          ) : (
            <Button
              disabled={!allAnswered || pending}
              onClick={() =>
                start(async () => {
                  if (signedIn) await completeLesson(lesson.id, correct, quizzes.length);
                  setFinished(true);
                })
              }
            >
              {tr(language, T.finish)}
            </Button>
          )}
          {!signedIn && <p className="text-sm text-muted-foreground">{tr(language, T.signIn)}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
