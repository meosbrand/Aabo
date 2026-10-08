"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerdictCard } from "@/components/verdict-card";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_LABEL } from "@/core/advice";
import type { Category } from "@/core/types";
import { L, tr } from "@/lib/i18n";
import { lookupAction, type LookupResult } from "@/app/check/actions";

const T = {
  title: L("Who is this?", "Who be this?"),
  sub: L(
    "Look up a phone number, bank account number, link or email in the Ààbò scam database.",
    "Check phone number, account number, link or email for Ààbò scam database.",
  ),
  label: L("Number, account, link or email", "Number, account, link or email"),
  go: L("Look up", "Check am"),
  confirmed: L("Confirmed scam", "Confirmed scam"),
  reported: L("Reported by the community", "People don report am"),
  verified: L("Verified legitimate", "Verified correct"),
  clean: L("No reports yet", "Nobody report am yet"),
  reports: L("reports", "reports"),
  cleanNote: L(
    "No reports doesn't guarantee it's safe — scammers change numbers often. If in doubt, check the full message.",
    "No report no mean say e safe — scammers dey change number every time. If you no sure, check the full message.",
  ),
};

export function LookupForm() {
  const { language } = useLanguage();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">{tr(language, T.title)}</h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResult(await lookupAction(value)));
        }}
      >
        <Label htmlFor="lookup">{tr(language, T.label)}</Label>
        <div className="flex gap-2">
          <Input id="lookup" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0803 123 4567 · 0123456789 · gtbank-verify.xyz" className="text-base" />
          <Button type="submit" disabled={pending || !value.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">{tr(language, T.go)}</span>
          </Button>
        </div>
      </form>

      {result && !result.ok && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{result.error}</p>}
      {result && result.ok && (
        <div className="space-y-4" data-testid="lookup-result">
          <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
            {result.confirmed ? (
              <ShieldAlert className="h-8 w-8 text-red-600" />
            ) : result.safe ? (
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            ) : result.reports > 0 ? (
              <Users className="h-8 w-8 text-orange-500" />
            ) : (
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-mono text-sm">{result.value}</p>
              <p className="text-lg font-bold">
                {tr(language, result.confirmed ? T.confirmed : result.safe ? T.verified : result.reports > 0 ? T.reported : T.clean)}
              </p>
              {result.reports > 0 && (
                <p className="text-sm">
                  {result.reports} {tr(language, T.reports)}
                  {result.category && CATEGORY_LABEL[result.category as Category] ? ` · ${tr(language, CATEGORY_LABEL[result.category as Category])}` : ""}
                  {result.label ? ` · ${result.label}` : ""}
                </p>
              )}
              {result.reports === 0 && !result.safe && <p className="text-sm text-muted-foreground">{tr(language, T.cleanNote)}</p>}
            </div>
          </div>
          {result.verdict.reasons.length > 0 && <VerdictCard verdict={result.verdict} readOnly />}
        </div>
      )}
    </div>
  );
}
