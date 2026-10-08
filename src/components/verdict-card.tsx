"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Copy, Flag, Info, ShieldAlert, ShieldCheck, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_LABEL, LEVEL_EMOJI, LEVEL_LABEL } from "@/core/advice";
import { defang } from "@/core/defang";
import { warningMessage, whatsappShareLink } from "@/core/format/chat";
import type { Level, Verdict } from "@/core/types";
import { L, tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { reportAction, safeAction } from "@/app/check/actions";

const LEVEL_STYLE: Record<Level, { box: string; bar: string; icon: typeof ShieldCheck }> = {
  SAFE: { box: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-50", bar: "bg-emerald-500", icon: ShieldCheck },
  SUSPICIOUS: { box: "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50", bar: "bg-amber-500", icon: AlertTriangle },
  LIKELY_SCAM: { box: "border-orange-400 bg-orange-50 text-orange-950 dark:bg-orange-950/40 dark:text-orange-50", bar: "bg-orange-500", icon: ShieldAlert },
  DANGEROUS: { box: "border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-50", bar: "bg-red-600", icon: ShieldAlert },
};

const T = {
  why: L("Why", "Why we talk am"),
  good: L("Good signs", "Wetin look correct"),
  todo: L("What to do now", "Wetin to do now"),
  links: L("Links (disabled for safety)", "Links (we don disable dem)"),
  report: L("Report scam", "Report scam"),
  reported: L("Reported — thank you!", "We don report am — thank you!"),
  safe: L("It's safe", "E safe"),
  safeThanks: L("Thanks — we'll learn from this.", "Thank you — we go learn from am."),
  warn: L("Warn others on WhatsApp", "Warn your people for WhatsApp"),
  copy: L("Copy warning", "Copy warning"),
  copied: L("Warning copied", "We don copy the warning"),
  seen: L("people checked this message this month", "people don check this message this month"),
  readFromImage: L("Text we read from your screenshot", "Text wey we read from your screenshot"),
  ai: L("AI-assisted", "AI help check am"),
};

export interface VerdictCardProps {
  verdict: Verdict;
  scanId?: string;
  seenCount?: number;
  /** Hide feedback buttons (e.g. on a shared result page that already has them). */
  readOnly?: boolean;
}

export function VerdictCard({ verdict, scanId, seenCount, readOnly }: VerdictCardProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<"scam" | "safe" | null>(null);
  const style = LEVEL_STYLE[verdict.level];
  const Icon = style.icon;

  const why = verdict.reasons.filter((r) => r.weight > 0);
  const good = verdict.reasons.filter((r) => r.weight < 0);
  const notes = verdict.reasons.filter((r) => r.weight === 0);
  const warning = warningMessage(verdict, language);

  const onReport = () =>
    start(async () => {
      if (!scanId) return;
      const res = await reportAction(scanId);
      if (res.ok) setFeedback("scam");
      else toast({ title: res.error ?? "Could not report", variant: "destructive" });
    });

  const onSafe = () =>
    start(async () => {
      if (!scanId) return;
      await safeAction(scanId);
      setFeedback("safe");
    });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(warning);
      toast({ title: tr(language, T.copied) });
    } catch {
      // Clipboard can be blocked; the WhatsApp button still works.
    }
  };

  return (
    <Card className={cn("border-2 shadow-md", style.box)} data-testid="verdict" data-level={verdict.level}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-8 w-8 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight">
              <span aria-hidden>{LEVEL_EMOJI[verdict.level]} </span>
              {tr(language, LEVEL_LABEL[verdict.level])}
            </p>
            {verdict.category && <p className="text-sm font-medium opacity-90">{tr(language, CATEGORY_LABEL[verdict.category])}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold tabular-nums">{verdict.score}</p>
            <p className="text-xs opacity-75">/ 100</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10" role="meter" aria-valuenow={verdict.score} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.max(4, verdict.score)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
          {seenCount && seenCount > 1 ? (
            <span>
              {seenCount} {tr(language, T.seen)}
            </span>
          ) : null}
          {verdict.usedLlm && <span>{tr(language, T.ai)}</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {verdict.ocrText && (
          <details className="rounded-md bg-white/60 p-2 dark:bg-black/20">
            <summary className="cursor-pointer font-medium">{tr(language, T.readFromImage)}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words">{verdict.ocrText}</p>
          </details>
        )}

        {why.length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">{tr(language, T.why)}</h3>
            <ul className="space-y-1.5">
              {why.slice(0, 6).map((r) => (
                <li key={r.id} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="break-words">{tr(language, r.text)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {good.length > 0 && verdict.level !== "DANGEROUS" && (
          <section>
            <h3 className="mb-1 font-semibold">{tr(language, T.good)}</h3>
            <ul className="space-y-1.5">
              {good.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span className="break-words">{tr(language, r.text)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notes.map((r) => (
          <p key={r.id} className="flex gap-2 opacity-90">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="break-words">{tr(language, r.text)}</span>
          </p>
        ))}

        <section>
          <h3 className="mb-1 font-semibold">{tr(language, T.todo)}</h3>
          <ol className="list-decimal space-y-1 pl-5">
            {verdict.actions.map((a, i) => (
              <li key={i}>{tr(language, a)}</li>
            ))}
          </ol>
        </section>

        {verdict.indicators.urls.length > 0 && verdict.level !== "SAFE" && (
          <section>
            <h3 className="mb-1 font-semibold">{tr(language, T.links)}</h3>
            <ul className="space-y-1 font-mono text-xs">
              {verdict.indicators.urls.slice(0, 4).map((u) => (
                <li key={u} className="break-all">
                  {defang(u)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!readOnly && (
          <div className="flex flex-wrap gap-2 pt-2">
            {verdict.level !== "SAFE" && (
              <>
                <Button asChild className="bg-[#25D366] text-white hover:bg-[#1da851]">
                  <a href={whatsappShareLink(warning)} target="_blank" rel="noopener noreferrer">
                    {tr(language, T.warn)}
                  </a>
                </Button>
                <Button variant="outline" onClick={onCopy}>
                  <Copy className="mr-1 h-4 w-4" aria-hidden />
                  {tr(language, T.copy)}
                </Button>
              </>
            )}
            {scanId && feedback === null && (
              <>
                <Button variant="destructive" onClick={onReport} disabled={pending}>
                  <Flag className="mr-1 h-4 w-4" aria-hidden />
                  {tr(language, T.report)}
                </Button>
                <Button variant="ghost" onClick={onSafe} disabled={pending}>
                  <ThumbsUp className="mr-1 h-4 w-4" aria-hidden />
                  {tr(language, T.safe)}
                </Button>
              </>
            )}
            {feedback === "scam" && <p className="font-medium">{tr(language, T.reported)}</p>}
            {feedback === "safe" && <p className="font-medium">{tr(language, T.safeThanks)}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
