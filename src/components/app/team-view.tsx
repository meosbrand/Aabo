"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Copy, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { CATEGORY_LABEL, LEVEL_EMOJI } from "@/core/advice";
import type { Category, Level } from "@/core/types";
import { L, tr } from "@/lib/i18n";
import { createInvite, removeMember } from "@/app/app/team/actions";

interface Props {
  orgName: string;
  isOwner: boolean;
  appUrl: string;
  lessonCount: number;
  members: { id: string; name: string; email: string; role: string; lessons: number; guardian: boolean; caught: number }[];
  feed: { id: string; level: string; category: string | null; channel: string; who: string; createdAt: string }[];
}

const T = {
  title: L("Team", "Team"),
  sub: L("Protect your staff too. Scammers target whoever handles payments and customers.", "Protect your staff too. Scammers dey target anybody wey dey handle payment and customers."),
  invite: L("Invite staff", "Invite staff"),
  inviteSub: L("Share this link with staff on WhatsApp. It expires in 7 days.", "Share this link give your staff for WhatsApp. E go expire for 7 days."),
  create: L("Create invite link", "Create invite link"),
  share: L("Send on WhatsApp", "Send for WhatsApp"),
  copy: L("Copy link", "Copy link"),
  members: L("Members", "Members"),
  name: L("Name", "Name"),
  lessons: L("Lessons", "Lessons"),
  guardian: L("Guardian", "Guardian"),
  caught: L("Scams caught (30d)", "Scams wey dem catch (30d)"),
  remove: L("Remove", "Remove"),
  feed: L("Scams hitting your team (30 days)", "Scams wey dey hit your team (30 days)"),
  noFeed: L("No scams detected for your team yet.", "We never see scam for your team yet."),
  inviteMsg: L("Join our business on Ààbò so you can check suspicious messages and learn to spot scams:", "Join our business for Ààbò make you fit check message wey you no trust and learn how to catch scam:"),
};

export function TeamView({ orgName, isOwner, appUrl, lessonCount, members, feed }: Props) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Users className="text-primary" /> {tr(language, T.title)}
          {orgName && <span className="text-lg font-normal text-muted-foreground">· {orgName}</span>}
        </h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tr(language, T.invite)}</CardTitle>
            <CardDescription>{tr(language, T.inviteSub)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await createInvite();
                  if (res.ok) setLink(`${base}/join/${res.code}`);
                  else toast({ title: res.error, variant: "destructive" });
                })
              }
            >
              {tr(language, T.create)}
            </Button>
            {link && (
              <div className="space-y-2">
                <p className="break-all rounded-md bg-secondary p-2 font-mono text-sm" data-testid="invite-link">{link}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-[#25D366] text-white hover:bg-[#1da851]">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`${tr(language, T.inviteMsg)} ${link}`)}`} target="_blank" rel="noopener noreferrer">
                      {tr(language, T.share)}
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(link).catch(() => undefined)}>
                    <Copy className="mr-1 h-4 w-4" /> {tr(language, T.copy)}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tr(language, T.members)}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr(language, T.name)}</TableHead>
                <TableHead>{tr(language, T.lessons)}</TableHead>
                <TableHead>{tr(language, T.guardian)}</TableHead>
                <TableHead>{tr(language, T.caught)}</TableHead>
                {isOwner && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.email} · {m.role}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {m.lessons}/{lessonCount}
                  </TableCell>
                  <TableCell>{m.guardian ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : "—"}</TableCell>
                  <TableCell className="tabular-nums">{m.caught}</TableCell>
                  {isOwner && (
                    <TableCell>
                      {m.role !== "owner" && (
                        <Button variant="ghost" size="sm" onClick={() => start(async () => void (await removeMember(m.id)))}>
                          {tr(language, T.remove)}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tr(language, T.feed)}</CardTitle>
        </CardHeader>
        <CardContent>
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr(language, T.noFeed)}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {feed.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                  <span>
                    {LEVEL_EMOJI[f.level as Level]} {f.category ? tr(language, CATEGORY_LABEL[f.category as Category]) : f.level}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {f.who} · {f.channel} · {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
