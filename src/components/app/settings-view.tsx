"use client";

import { useState, useTransition } from "react";
import { Bell, KeyRound, Link2, MessageCircle, Send, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type Language } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";
import { createApiKeyAction, createLinkCode, revokeApiKey, savePushSubscription, updatePreferences } from "@/app/app/actions";

interface Props {
  language: Language;
  alertThreshold: string;
  apiKeys: { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null }[];
  chats: { id: string; channel: string; displayName: string | null; phone: string | null }[];
  vapidKey: string | null;
  botNumber: string | null;
  telegramBot: string | null;
}

const T = {
  title: L("Settings", "Settings"),
  prefs: L("Preferences", "Preferences"),
  lang: L("Language for alerts and the bot", "Language for alerts and bot"),
  threshold: L("Warn me (Guardian) when a message is at least…", "Warn me (Guardian) when message reach…"),
  save: L("Save", "Save"),
  saved: L("Saved", "We don save am"),
  chats: L("Connect the Ààbò chat bot", "Connect Ààbò chat bot"),
  chatsSub: L("Link your WhatsApp/Telegram chat with the bot so your checks appear here and you get higher limits.", "Link your WhatsApp/Telegram chat with the bot so your checks go show here and you go get bigger limit."),
  getCode: L("Get link code", "Collect link code"),
  sendThis: L("Send this message to the Ààbò bot within 15 minutes:", "Send this message give Ààbò bot before 15 minutes:"),
  linked: L("Linked chats", "Chats wey don link"),
  none: L("None yet", "Nothing yet"),
  push: L("Alerts on this phone", "Alerts for this phone"),
  pushSub: L("Get a notification when Guardian spots a scam.", "Get notification when Guardian see scam."),
  enablePush: L("Turn on notifications", "On notifications"),
  pushOn: L("Notifications are on for this device.", "Notifications don on for this phone."),
  pushUnavailable: L("Push notifications are not configured on this server yet (VAPID keys).", "Push notification never set for this server (VAPID keys)."),
  api: L("API keys (partners & integrations)", "API keys (partners & integrations)"),
  apiSub: L("Use the Ààbò API to check messages from your own systems: POST /api/v1/scan with Authorization: Bearer <key>.", "Use Ààbò API check messages from your own system: POST /api/v1/scan with Authorization: Bearer <key>."),
  keyName: L("Key name", "Key name"),
  create: L("Create key", "Create key"),
  copyOnce: L("Copy this key now — it will not be shown again:", "Copy this key now — you no go see am again:"),
  revoke: L("Revoke", "Cancel am"),
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function SettingsView(props: Props) {
  const { language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [lang, setLang] = useState<Language>(props.language);
  const [threshold, setThreshold] = useState(props.alertThreshold);
  const [code, setCode] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const savePrefs = () =>
    start(async () => {
      await updatePreferences({ language: lang, alertThreshold: threshold });
      setLanguage(lang);
      toast({ title: tr(lang, T.saved) });
    });

  const enablePush = () =>
    start(async () => {
      if (!props.vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(props.vapidKey) });
      const res = await savePushSubscription(sub.toJSON());
      setPushOn(res.ok);
    });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr(language, T.title)}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5" /> {tr(language, T.prefs)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pref-lang">{tr(language, T.lang)}</Label>
            <select id="pref-lang" value={lang} onChange={(e) => setLang(e.target.value as Language)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="en">English</option>
              <option value="pidgin">Pidgin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pref-threshold">{tr(language, T.threshold)}</Label>
            <select id="pref-threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="SUSPICIOUS">🟡 Suspicious</option>
              <option value="LIKELY_SCAM">🟠 Likely scam</option>
              <option value="DANGEROUS">🔴 Dangerous</option>
            </select>
          </div>
          <Button onClick={savePrefs} disabled={pending}>
            {tr(language, T.save)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5" /> {tr(language, T.chats)}
          </CardTitle>
          <CardDescription>{tr(language, T.chatsSub)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => start(async () => setCode((await createLinkCode()).code))} disabled={pending}>
              {tr(language, T.getCode)}
            </Button>
            {props.botNumber && (
              <Button asChild variant="outline">
                <a href={`https://wa.me/${props.botNumber}?text=${encodeURIComponent(code ? `link ${code}` : "Hi Ààbò")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
            {props.telegramBot && (
              <Button asChild variant="outline">
                <a href={`https://t.me/${props.telegramBot}`} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-1 h-4 w-4" /> Telegram
                </a>
              </Button>
            )}
          </div>
          {code && (
            <p className="rounded-md bg-secondary p-3 text-sm">
              {tr(language, T.sendThis)} <span className="select-all font-mono text-base font-bold">link {code}</span>
            </p>
          )}
          <div>
            <p className="text-sm font-medium">{tr(language, T.linked)}</p>
            {props.chats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr(language, T.none)}</p>
            ) : (
              <ul className="text-sm text-muted-foreground">
                {props.chats.map((c) => (
                  <li key={c.id}>
                    {c.channel} · {c.displayName ?? c.phone ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" /> {tr(language, T.push)}
          </CardTitle>
          <CardDescription>{tr(language, T.pushSub)}</CardDescription>
        </CardHeader>
        <CardContent>
          {!props.vapidKey ? (
            <p className="text-sm text-muted-foreground">{tr(language, T.pushUnavailable)}</p>
          ) : pushOn ? (
            <p className="text-sm">{tr(language, T.pushOn)}</p>
          ) : (
            <Button onClick={enablePush} disabled={pending}>
              {tr(language, T.enablePush)}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" /> {tr(language, T.api)}
          </CardTitle>
          <CardDescription>{tr(language, T.apiSub)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder={tr(language, T.keyName)} value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <Button onClick={() => start(async () => setNewKey((await createApiKeyAction(keyName)).key))} disabled={pending}>
              {tr(language, T.create)}
            </Button>
          </div>
          {newKey && (
            <p className="break-all rounded-md bg-secondary p-3 text-sm">
              {tr(language, T.copyOnce)} <span className="select-all font-mono">{newKey}</span>
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {props.apiKeys.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-md border p-2">
                <span>
                  <span className="font-medium">{k.name}</span> <span className="font-mono text-muted-foreground">{k.prefix}…</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => start(async () => void (await revokeApiKey(k.id)))}>
                  {tr(language, T.revoke)}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
