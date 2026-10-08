"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/LanguageContext";
import { CHECKUP, CHECKUP_TOTAL_WEIGHT } from "@/core/awareness/checkup";
import { L, tr } from "@/lib/i18n";
import { setCheckupItem } from "@/app/app/learn/actions";

const T = {
  title: L("Security checkup", "Security checkup"),
  sub: L("Tick what you have already done. Each item takes 1–2 minutes and raises your protection score.", "Tick wetin you don already do. Each one na 1–2 minutes and e go raise your protection score."),
  score: L("Checkup score", "Checkup score"),
};

export function CheckupList({ done: initial }: { done: string[] }) {
  const { language } = useLanguage();
  const [done, setDone] = useState(new Set(initial));
  const [, start] = useTransition();
  const weight = CHECKUP.filter((i) => done.has(i.id)).reduce((s, i) => s + i.weight, 0);
  const pct = Math.round((weight / CHECKUP_TOTAL_WEIGHT) * 100);

  const toggle = (id: string, value: boolean) => {
    setDone((d) => {
      const next = new Set(d);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
    start(async () => void (await setCheckupItem(id, value)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <ClipboardCheck className="text-primary" /> {tr(language, T.title)}
        </h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{tr(language, T.score)}</span>
          <span className="font-semibold tabular-nums" data-testid="checkup-score">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="space-y-3">
        {CHECKUP.map((item) => (
          <Card key={item.id} className={done.has(item.id) ? "border-emerald-400" : ""}>
            <CardContent className="flex gap-3 p-4">
              <Checkbox id={item.id} checked={done.has(item.id)} onCheckedChange={(v) => toggle(item.id, v === true)} className="mt-1" />
              <label htmlFor={item.id} className="cursor-pointer space-y-1">
                <p className="font-medium">{tr(language, item.title)}</p>
                <p className="text-sm text-muted-foreground">{tr(language, item.how)}</p>
              </label>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
