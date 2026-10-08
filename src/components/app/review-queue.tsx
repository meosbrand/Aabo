"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voteOnReport } from "@/app/admin/review/actions";

interface Item {
  type: string;
  value: string;
  reports: number;
  last: string;
  category: string | null;
  note: string | null;
  excerpt: string | null;
  level: string | null;
  confirms: number;
  rejects: number;
}

export function ReviewQueue({ items, role }: { items: Item[]; role: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Review community reports</h1>
        <p className="text-muted-foreground">
          Confirmed items become high-confidence warnings for everyone. {role === "admin" ? "Your vote decides." : "Two matching reviewer votes decide."}
        </p>
      </div>
      {items.length === 0 && <p className="text-muted-foreground">Nothing to review. 🎉</p>}
      {items.map((i) => (
        <Card key={`${i.type}:${i.value}`} data-testid="review-item">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase">{i.type}</span>
              <span className="break-all font-mono">{i.value}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {i.reports} report(s) · {i.category ?? "uncategorised"} {i.level ? `· engine said ${i.level}` : ""} · votes ✔ {i.confirms} ✘ {i.rejects}
            </p>
            {i.excerpt && <blockquote className="whitespace-pre-wrap break-words border-l-4 pl-3 text-muted-foreground">{i.excerpt}</blockquote>}
            {i.note && <p>Note: {i.note}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => void (await voteOnReport(i.type, i.value, "confirm")))}>
                <Check className="mr-1 h-4 w-4" /> Confirm scam
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => void (await voteOnReport(i.type, i.value, "reject")))}>
                <X className="mr-1 h-4 w-4" /> Not a scam
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
