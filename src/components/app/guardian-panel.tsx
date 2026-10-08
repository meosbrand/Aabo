"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";
import { getGuardianStatus, setGuardianState, startGuardian, updateGuardianOptions, type GuardianStatus } from "@/app/app/actions";

const T = {
  title: L("WhatsApp Guardian", "WhatsApp Guardian"),
  sub: L(
    "Ààbò links to your WhatsApp like WhatsApp Web and warns you — only in your own \"Message yourself\" chat — when a scam arrives. It never replies to anyone for you.",
    "Ààbò go link to your WhatsApp like WhatsApp Web, and e go warn you — only for your own \"Message yourself\" chat — when scam enter. E no go ever reply anybody for you.",
  ),
  how: L("How it works", "How e dey work"),
  how1: L("Every incoming chat message is checked by the Ààbò engine.", "Ààbò engine go check every message wey enter your chats."),
  how2: L("If it looks like a scam, you get a warning in your \"Message yourself\" chat and on this app.", "If e be like scam, you go see warning for your \"Message yourself\" chat and for this app."),
  how3: L("We store only the verdict and sender — never your message text.", "We dey keep only the result and who send am — we no dey keep your message."),
  how4: L("You can unlink at any time here or in WhatsApp › Linked devices.", "You fit unlink anytime here or for WhatsApp › Linked devices."),
  phone: L("Your WhatsApp number", "Your WhatsApp number"),
  groups: L("Also check group messages", "Check group messages too"),
  consent: L(
    "I agree that Ààbò may process messages arriving on this WhatsApp account to detect scams, as described above (Nigeria Data Protection Act 2023). I am the owner of this number.",
    "I agree make Ààbò process messages wey enter this WhatsApp to catch scam, as e dey above (Nigeria Data Protection Act 2023). Na me get this number.",
  ),
  link: L("Get my linking code", "Give me linking code"),
  waiting: L("Preparing your code…", "We dey prepare your code…"),
  codeTitle: L("Enter this code in WhatsApp", "Put this code for WhatsApp"),
  step1: L("Open WhatsApp on your phone", "Open WhatsApp for your phone"),
  step2: L("Tap ⋮ (or Settings) › Linked devices › Link a device", "Tap ⋮ (or Settings) › Linked devices › Link a device"),
  step3: L("Tap \"Link with phone number instead\"", "Tap \"Link with phone number instead\""),
  step4: L("Type the code above", "Type the code wey dey above"),
  qrTitle: L("Or scan this QR code from another phone/computer", "Or scan this QR code from another phone/computer"),
  connected: L("Guardian is ON", "Guardian dey ON"),
  connectedSub: L("Watching", "E dey watch"),
  pause: L("Pause", "Pause"),
  resume: L("Resume", "Start am again"),
  unlink: L("Unlink WhatsApp", "Unlink WhatsApp"),
  paused: L("Guardian is paused", "Guardian don pause"),
  error: L("Something went wrong", "Something spoil"),
  retry: L("Try again", "Try again"),
  needsGateway: L(
    "Waiting for the Ààbò gateway to pick this up. If this takes more than a minute, make sure `npm run gateway` is running.",
    "We dey wait make Ààbò gateway carry am. If e pass one minute, make sure say `npm run gateway` dey run.",
  ),
};

const ACTIVE = new Set(["pending", "connecting", "pairing", "qr", "disconnected"]);

export function GuardianPanel({ initial }: { initial: GuardianStatus }) {
  const { language } = useLanguage();
  const [status, setStatus] = useState(initial);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [groups, setGroups] = useState(initial.scanGroups);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const linking = status.desiredState === "running" && ACTIVE.has(status.status);
  const connected = status.status === "connected" && status.desiredState === "running";

  useEffect(() => {
    if (!linking && !connected) return;
    const t = setInterval(async () => setStatus(await getGuardianStatus()), linking ? 2000 : 15000);
    return () => clearInterval(t);
  }, [linking, connected]);

  const onLink = () =>
    start(async () => {
      setError(null);
      const res = await startGuardian({ phone, consent, scanGroups: groups });
      if (!res.ok) setError(res.error ?? tr(language, T.error));
      setStatus(await getGuardianStatus());
    });

  const setState = (s: "running" | "stopped" | "logout") =>
    start(async () => {
      await setGuardianState(s);
      setStatus(await getGuardianStatus());
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <ShieldCheck className="text-primary" /> {tr(language, T.title)}
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{tr(language, T.sub)}</p>
      </div>

      {connected && (
        <Card className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" data-testid="guardian-connected">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" /> {tr(language, T.connected)}
            </CardTitle>
            <CardDescription>
              {tr(language, T.connectedSub)} {status.phone}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="groups-on"
                checked={status.scanGroups}
                onCheckedChange={(v) =>
                  start(async () => {
                    await updateGuardianOptions({ scanGroups: v });
                    setStatus(await getGuardianStatus());
                  })
                }
              />
              <Label htmlFor="groups-on">{tr(language, T.groups)}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setState("stopped")} disabled={pending}>
                {tr(language, T.pause)}
              </Button>
              <Button variant="destructive" onClick={() => setState("logout")} disabled={pending}>
                {tr(language, T.unlink)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {linking && (
        <Card data-testid="guardian-linking">
          <CardHeader>
            <CardTitle>{status.pairingCode ? tr(language, T.codeTitle) : tr(language, T.waiting)}</CardTitle>
            {!status.pairingCode && !status.qrDataUrl && <CardDescription>{tr(language, T.needsGateway)}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">
            {status.pairingCode ? (
              <p className="select-all text-center font-mono text-4xl font-extrabold tracking-widest" data-testid="pairing-code">
                {status.pairingCode}
              </p>
            ) : (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            )}
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>{tr(language, T.step1)}</li>
              <li>{tr(language, T.step2)}</li>
              <li>{tr(language, T.step3)}</li>
              <li>{tr(language, T.step4)}</li>
            </ol>
            {status.qrDataUrl && (
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">{tr(language, T.qrTitle)}</summary>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={status.qrDataUrl} alt="WhatsApp linking QR code" className="mx-auto mt-3 h-64 w-64 rounded bg-white p-2" />
              </details>
            )}
            {status.lastError && <p className="text-sm text-muted-foreground">{status.lastError}</p>}
            <Button variant="ghost" onClick={() => setState("stopped")} disabled={pending}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {!connected && !linking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.id ? <ShieldOff className="text-muted-foreground" /> : <Smartphone className="text-primary" />}
              {status.id && status.status !== "logged_out" && status.status !== "error" ? tr(language, T.paused) : tr(language, T.title)}
            </CardTitle>
            {status.status === "error" && status.lastError && <CardDescription className="text-destructive">{status.lastError}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="rounded-md bg-secondary p-3 text-sm">
              <p className="mb-1 font-semibold">{tr(language, T.how)}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{tr(language, T.how1)}</li>
                <li>{tr(language, T.how2)}</li>
                <li>{tr(language, T.how3)}</li>
                <li>{tr(language, T.how4)}</li>
              </ul>
            </section>
            <div className="space-y-2">
              <Label htmlFor="wa-phone">{tr(language, T.phone)}</Label>
              <Input id="wa-phone" inputMode="tel" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="groups" checked={groups} onCheckedChange={setGroups} />
              <Label htmlFor="groups">{tr(language, T.groups)}</Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                {tr(language, T.consent)}
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onLink} disabled={pending || !consent || !phone.trim()}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tr(language, T.link)}
              </Button>
              {status.id && status.desiredState === "stopped" && !["logged_out", "error"].includes(status.status) && (
                <Button variant="outline" onClick={() => setState("running")} disabled={pending}>
                  {tr(language, T.resume)}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
