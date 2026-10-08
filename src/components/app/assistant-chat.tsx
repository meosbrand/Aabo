"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Bot, Send, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VerdictCard } from "@/components/verdict-card";
import { useLanguage } from "@/context/LanguageContext";
import type { Verdict } from "@/core/types";
import { L, tr } from "@/lib/i18n";
import { assistantAction } from "@/app/app/copilot/actions";

type Message =
  | { id: string; role: "user" | "bot"; content: string }
  | { id: string; role: "verdict"; verdict: Verdict; scanId: string; seenCount: number };

const T = {
  title: L("Check & ask", "Check & ask"),
  sub: L("Paste any message, link or number to check it — or ask Ààbò a security question.", "Paste any message, link or number make we check am — or ask Ààbò any security question."),
  empty: L("Try: “Someone says my BVN will be blocked, what should I do?”", "Try: “Person talk say dem go block my BVN, wetin I go do?”"),
  placeholder: L("Paste a message or ask a question…", "Paste message or ask question…"),
  check: L("Check", "Check"),
  ask: L("Ask", "Ask"),
};

export function AssistantChat({ history }: { history: { id: string; role: "user" | "bot"; content: string }[] }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(history);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, pending]);

  const send = (mode: "auto" | "check" | "ask") => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", content: text }]);
    setInput("");
    start(async () => {
      const res = await assistantAction(text, language, mode);
      setMessages((m) => [
        ...m,
        res.kind === "verdict"
          ? { id: `v${Date.now()}`, role: "verdict", verdict: res.verdict, scanId: res.scanId, seenCount: res.seenCount }
          : { id: `b${Date.now()}`, role: "bot", content: res.text },
      ]);
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">{tr(language, T.title)}</h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>
      <Card className="flex min-h-[60vh] flex-1 flex-col">
        <CardContent className="flex-1 space-y-5 overflow-y-auto p-4">
          {messages.length === 0 && !pending && (
            <div className="p-8 text-center text-muted-foreground">
              <Bot className="mx-auto mb-3 h-12 w-12" />
              <p>{tr(language, T.empty)}</p>
            </div>
          )}
          {messages.map((m) =>
            m.role === "verdict" ? (
              <div key={m.id} className="max-w-2xl">
                <VerdictCard verdict={m.verdict} scanId={m.scanId} seenCount={m.seenCount} />
              </div>
            ) : (
              <div key={m.id} className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "bot" && (
                  <Avatar className="h-8 w-8 border-2 border-primary">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[85%] rounded-xl p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                {m.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ),
          )}
          {pending && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border-2 border-primary">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 rounded-xl bg-secondary p-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </CardContent>
        <form
          className="flex flex-col gap-2 border-t p-3 sm:flex-row sm:items-end"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send("auto");
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send("auto");
              }
            }}
            placeholder={tr(language, T.placeholder)}
            rows={2}
            maxLength={6000}
            disabled={pending}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={pending || !input.trim()} onClick={() => send("check")}>
              {tr(language, T.check)}
            </Button>
            <Button type="button" variant="outline" disabled={pending || !input.trim()} onClick={() => send("ask")}>
              {tr(language, T.ask)}
            </Button>
            <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
