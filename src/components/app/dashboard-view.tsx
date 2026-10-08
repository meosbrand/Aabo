"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bot, ChevronRight, Lightbulb, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_LABEL, LEVEL_EMOJI, LEVEL_LABEL } from "@/core/advice";
import type { Bilingual, Category, Level } from "@/core/types";
import { L, tr } from "@/lib/i18n";
import { markAlertsRead } from "@/app/app/actions";

interface Props {
  name: string;
  stats: { scans: number; flagged: number; dangerous: number };
  protection: { score: number; parts: { id: string; label: Bilingual; points: number; max: number; href: string }[]; next: { label: Bilingual; href: string } | null };
  guardian: { connected: boolean; phone: string | null } | null;
  alerts: { id: string; level: string; category: string | null; sender: string | null; summary: string; createdAt: string; unread: boolean }[];
  recentScans: { id: string; level: string; category: string | null; excerpt: string | null; channel: string; createdAt: string }[];
  tip: Bilingual;
}

const T = {
  hello: L("Hello", "How far"),
  sub: L("Here is your business's scam protection at a glance.", "See how your business protection dey today."),
  protection: L("Protection score", "Protection level"),
  next: L("Next best step", "Wetin to do next"),
  checks: L("Messages checked (30 days)", "Messages wey you check (30 days)"),
  flagged: L("Scams caught", "Scams wey we catch"),
  dangerous: L("Dangerous", "Danger"),
  guardian: L("WhatsApp Guardian", "WhatsApp Guardian"),
  guardianOn: L("Watching your WhatsApp for scams", "E dey watch your WhatsApp for scam"),
  guardianOff: L("Not connected — link your WhatsApp to get automatic warnings.", "E never connect — link your WhatsApp make you dey get warning by yourself."),
  setup: L("Set up", "Set am up"),
  manage: L("Manage", "Manage"),
  alerts: L("Guardian alerts", "Guardian alerts"),
  noAlerts: L("No alerts yet. When Guardian spots a scam in your chats it shows here.", "No alert yet. When Guardian see scam for your chats e go show here."),
  markRead: L("Mark all read", "Mark all as read"),
  recent: L("Your recent checks", "Wetin you check recently"),
  noScans: L("Nothing checked yet.", "You never check anything yet."),
  check: L("Check a message", "Check message"),
  tip: L("Tip of the day", "Tip of the day"),
};

function levelBadge(level: string, language: "en" | "pidgin") {
  const lv = level as Level;
  return (
    <span className="whitespace-nowrap text-xs font-semibold">
      {LEVEL_EMOJI[lv] ?? "⚪"} {LEVEL_LABEL[lv] ? tr(language, LEVEL_LABEL[lv]) : level}
    </span>
  );
}

export function DashboardView({ name, stats, protection, guardian, alerts, recentScans, tip }: Props) {
  const { language } = useLanguage();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">
            {tr(language, T.hello)}, {name} 👋🏾
          </h1>
          <p className="text-muted-foreground">{tr(language, T.sub)}</p>
        </div>
        <Button asChild>
          <Link href="/app/copilot">
            <Bot className="mr-1 h-4 w-4" />
            {tr(language, T.check)}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" />
              {tr(language, T.protection)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold tabular-nums" data-testid="protection-score">{protection.score}</span>
              <span className="pb-1 text-muted-foreground">/ 100</span>
            </div>
            <Progress value={protection.score} className="h-3" />
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {protection.parts.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="flex items-center justify-between rounded px-1 hover:bg-secondary">
                    <span>{tr(language, p.label)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {p.points}/{p.max}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {protection.next && (
              <Button asChild variant="secondary" size="sm">
                <Link href={protection.next.href}>
                  {tr(language, T.next)}: {tr(language, protection.next.label)}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {guardian?.connected ? <ShieldCheck className="text-emerald-600" /> : <ShieldOff className="text-muted-foreground" />}
              {tr(language, T.guardian)}
            </CardTitle>
            <CardDescription>
              {guardian?.connected ? `${tr(language, T.guardianOn)} (${guardian.phone})` : tr(language, T.guardianOff)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant={guardian?.connected ? "outline" : "default"} className="w-full">
              <Link href="/app/guardian">{tr(language, guardian?.connected ? T.manage : T.setup)}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: T.checks, value: stats.scans, icon: Bot },
          { label: T.flagged, value: stats.flagged, icon: ShieldAlert },
          { label: T.dangerous, value: stats.dangerous, icon: AlertTriangle },
        ].map((s) => (
          <Card key={s.label.en}>
            <CardContent className="p-4">
              <s.icon className="mb-1 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{tr(language, s.label)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{tr(language, T.alerts)}</CardTitle>
            {alerts.some((a) => a.unread) && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => void (await markAlertsRead()))}>
                {tr(language, T.markRead)}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr(language, T.noAlerts)}</p>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a) => (
                  <li key={a.id} className={`rounded-md border p-2 text-sm ${a.unread ? "border-destructive/50 bg-destructive/5" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      {levelBadge(a.level, language)}
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="font-medium">{a.category ? tr(language, CATEGORY_LABEL[a.category as Category]) : a.summary}</p>
                    {a.sender && <p className="text-xs text-muted-foreground">{a.sender}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tr(language, T.recent)}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr(language, T.noScans)}</p>
            ) : (
              <ul className="space-y-2">
                {recentScans.map((s) => (
                  <li key={s.id}>
                    <Link href={`/check/${s.id}`} className="block rounded-md border p-2 text-sm hover:bg-secondary">
                      <div className="flex items-center justify-between gap-2">
                        {levelBadge(s.level, language)}
                        <span className="text-xs text-muted-foreground">
                          {s.channel} · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-muted-foreground">{s.excerpt ?? "—"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-accent bg-accent/20">
        <CardContent className="flex gap-3 p-4">
          <Lightbulb className="h-6 w-6 shrink-0 text-accent-foreground" />
          <div>
            <p className="font-semibold">{tr(language, T.tip)}</p>
            <p className="text-sm">{tr(language, tip)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
