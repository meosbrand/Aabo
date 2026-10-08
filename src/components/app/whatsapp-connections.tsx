"use client";

import { useState, useTransition } from "react";
import { Copy, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { CONNECTION_ERROR_TEXT, DEV_ERROR_TEXT } from "@/lib/developer-text";
import type { ConnectionSecrets, ConnectionView, WhatsAppProvider } from "@/lib/developer-types";
import { L, tr } from "@/lib/i18n";
import {
  createConnectionAction,
  deleteConnectionAction,
  rotateConnectionAction,
  testConnectionAction,
  updateConnectionAction,
  verifyConnectionAction,
  type ConnectionActionResult,
} from "@/app/app/developer/actions";

const PROVIDERS: Record<WhatsAppProvider, string> = { meta: "Meta WhatsApp Cloud API", twilio: "Twilio", d360: "360dialog" };

const T = {
  own: L("Your own WhatsApp number", "Your own WhatsApp number"),
  ownSub: L(
    "Connect a number on the official WhatsApp API. People who message it get Ààbò checks, answered from your number.",
    "Connect number wey dey official WhatsApp API. People wey message am go get Ààbò checks, from your own number.",
  ),
  add: L("Add a number", "Add number"),
  provider: L("Provider", "Provider"),
  label: L("Name (for you)", "Name (for you)"),
  pnid: L("Phone number ID", "Phone number ID"),
  token: L("Access token (system user)", "Access token (system user)"),
  appSecret: L("App secret", "App secret"),
  accountSid: L("Account SID", "Account SID"),
  authToken: L("Auth Token", "Auth Token"),
  number: L("WhatsApp sender number", "WhatsApp sender number"),
  msid: L("Messaging Service SID (optional)", "Messaging Service SID (optional)"),
  d360key: L("360dialog API key", "360dialog API key"),
  save: L("Connect", "Connect am"),
  cancel: L("Cancel", "Cancel"),
  copyOnce: L("Copy these now — the secret is shown only once.", "Copy dem now — we go show the secret only once."),
  webhook: L("Webhook URL", "Webhook URL"),
  verifyToken: L("Verify token", "Verify token"),
  headerSecret: L("Header secret (x-aabo-webhook-secret)", "Header secret (x-aabo-webhook-secret)"),
  stepsMeta: L(
    "In your Meta app › WhatsApp › Configuration, set the callback URL and verify token above and subscribe to “messages”. Then press Verify.",
    "For your Meta app › WhatsApp › Configuration, put the callback URL and verify token for up and subscribe to “messages”. Then press Verify.",
  ),
  stepsTwilio: L(
    "In Twilio › Messaging › WhatsApp senders, set “When a message comes in” to the webhook URL (HTTP POST). Then press Verify.",
    "For Twilio › Messaging › WhatsApp senders, set “When a message comes in” to the webhook URL (HTTP POST). Then press Verify.",
  ),
  stepsD360: L(
    "Press Verify: Ààbò sets the webhook on 360dialog for you. If that fails, set the URL and the header secret above in the 360dialog hub.",
    "Press Verify: Ààbò go set the webhook for 360dialog by itself. If e fail, set the URL and the header secret for 360dialog hub.",
  ),
  verify: L("Verify", "Verify"),
  testTo: L("Send a test to (number with country code)", "Send test to (number with country code)"),
  sendTest: L("Send test", "Send test"),
  sent: L("Test message sent", "We don send the test message"),
  verified: L("Credentials verified", "Credentials don verify"),
  rotate: L("New webhook secret", "New webhook secret"),
  remove: L("Remove", "Comot am"),
  removeConfirm: L("Remove this number from Ààbò?", "Comot this number from Ààbò?"),
  enabled: L("On", "On"),
  copilot: L("Answer security questions (Co-pilot)", "Answer security questions (Co-pilot)"),
  receipts: L("Read receipts + typing", "Read receipts + typing"),
  tips: L("Daily tips (only inside WhatsApp's 24-hour window)", "Daily tips (only inside WhatsApp 24-hour window)"),
  perUser: L("Checks per person per day", "Checks per person per day"),
  orgCap: L("Checks per day for this business", "Checks per day for this business"),
  saveLimits: L("Save limits", "Save limits"),
  lastMessage: L("Last message", "Last message"),
  never: L("never", "never"),
  copied: L("Copied", "We don copy am"),
};

const STATUS: Record<string, { label: { en: string; pidgin: string }; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: L("Not verified", "Never verify"), variant: "secondary" },
  verified: { label: L("Verified", "Verified"), variant: "outline" },
  active: { label: L("Receiving messages", "Messages dey come"), variant: "default" },
  error: { label: L("Error", "Error"), variant: "destructive" },
};

type Draft = Record<string, string>;

function CopyField({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} data-testid={testId} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copy"
          onClick={() => navigator.clipboard?.writeText(value).then(() => toast({ title: tr(language, T.copied) }))}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SecretsPanel({ secrets, provider }: { secrets: ConnectionSecrets; provider: WhatsAppProvider }) {
  const { language } = useLanguage();
  return (
    <div className="space-y-3 rounded-md border border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/30" data-testid="connection-secrets">
      <p className="text-sm font-medium">{tr(language, T.copyOnce)}</p>
      <CopyField label={tr(language, T.webhook)} value={secrets.webhookUrl} testId="secret-webhook-url" />
      {secrets.verifyToken && <CopyField label={tr(language, T.verifyToken)} value={secrets.verifyToken} testId="secret-verify-token" />}
      {secrets.webhookSecret && <CopyField label={tr(language, T.headerSecret)} value={secrets.webhookSecret} testId="secret-header" />}
      <p className="text-sm text-muted-foreground">{tr(language, provider === "meta" ? T.stepsMeta : provider === "twilio" ? T.stepsTwilio : T.stepsD360)}</p>
    </div>
  );
}

export function WhatsAppConnections({ connections, editable }: { connections: ConnectionView[]; editable: boolean }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [provider, setProvider] = useState<WhatsAppProvider>("meta");
  const [draft, setDraft] = useState<Draft>({});
  const [shown, setShown] = useState<{ id: string; provider: WhatsAppProvider; secrets: ConnectionSecrets } | null>(null);

  const field = (name: string, labelText: { en: string; pidgin: string }, opts: { secret?: boolean; placeholder?: string } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`wa-${name}`}>{tr(language, labelText)}</Label>
      <Input
        id={`wa-${name}`}
        data-testid={`wa-${name}`}
        type={opts.secret ? "password" : "text"}
        autoComplete="off"
        placeholder={opts.placeholder}
        value={draft[name] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
      />
    </div>
  );

  const fail = (res: ConnectionActionResult) => {
    if (res.ok) return false;
    const text =
      res.code === "provider_error" && res.message && res.message in CONNECTION_ERROR_TEXT
        ? tr(language, CONNECTION_ERROR_TEXT[res.message as keyof typeof CONNECTION_ERROR_TEXT])
        : res.message ?? tr(language, DEV_ERROR_TEXT[res.code]);
    toast({ variant: "destructive", title: text });
    return true;
  };

  const create = () =>
    start(async () => {
      const res = await createConnectionAction({ provider, ...draft });
      if (fail(res) || !res.ok || !res.connection || !res.secrets) return;
      setShown({ id: res.connection.id, provider, secrets: res.secrets });
      setDraft({});
      setAdding(false);
    });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <MessageCircle className="h-5 w-5 text-primary" />
          {tr(language, T.own)}
        </h3>
        <p className="text-sm text-muted-foreground">{tr(language, T.ownSub)}</p>
      </div>

      {shown && <SecretsPanel secrets={shown.secrets} provider={shown.provider} />}

      {connections.map((c) => (
        <ConnectionCard key={c.id} c={c} editable={editable} onSecrets={(secrets) => setShown({ id: c.id, provider: c.provider, secrets })} onFail={fail} />
      ))}

      {!adding ? (
        <Button type="button" variant="outline" disabled={!editable} onClick={() => setAdding(true)} data-testid="wa-add">
          <Plus className="mr-1 h-4 w-4" />
          {tr(language, T.add)}
        </Button>
      ) : (
        <fieldset disabled={pending} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="wa-provider">{tr(language, T.provider)}</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as WhatsAppProvider)}>
                <SelectTrigger id="wa-provider" data-testid="wa-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDERS) as WhatsAppProvider[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDERS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("label", T.label, { placeholder: "Shop line" })}
            {provider !== "twilio" && field("phoneNumberId", T.pnid, { placeholder: "1234567890123" })}
            {provider === "meta" && field("accessToken", T.token, { secret: true })}
            {provider === "meta" && field("appSecret", T.appSecret, { secret: true })}
            {provider === "twilio" && field("accountSid", T.accountSid, { placeholder: "AC…" })}
            {provider === "twilio" && field("authToken", T.authToken, { secret: true })}
            {provider === "twilio" && field("number", T.number, { placeholder: "+2348012345678" })}
            {provider === "twilio" && field("messagingServiceSid", T.msid, { placeholder: "MG…" })}
            {provider === "d360" && field("apiKey", T.d360key, { secret: true })}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={create} data-testid="wa-save">
              {tr(language, T.save)}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              {tr(language, T.cancel)}
            </Button>
          </div>
        </fieldset>
      )}
    </div>
  );
}

function ConnectionCard({
  c,
  editable,
  onSecrets,
  onFail,
}: {
  c: ConnectionView;
  editable: boolean;
  onSecrets: (s: ConnectionSecrets) => void;
  onFail: (res: ConnectionActionResult) => boolean;
}) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [to, setTo] = useState("");
  const [perUser, setPerUser] = useState(String(c.dailyLimitPerUser));
  const [orgCap, setOrgCap] = useState(String(c.orgDailyCap));
  const status = STATUS[c.status] ?? STATUS.pending;
  const errorText = c.lastError && c.lastError in CONNECTION_ERROR_TEXT ? tr(language, CONNECTION_ERROR_TEXT[c.lastError as keyof typeof CONNECTION_ERROR_TEXT]) : null;

  const run = (fn: () => Promise<ConnectionActionResult>, ok?: { en: string; pidgin: string }, after?: (res: ConnectionActionResult) => void) =>
    start(async () => {
      const res = await fn();
      if (onFail(res)) return;
      if (ok) toast({ title: tr(language, ok) });
      after?.(res);
    });

  const toggle = (key: "enabled" | "copilotEnabled" | "readReceipts" | "tipsEnabled", value: boolean) => run(() => updateConnectionAction(c.id, { [key]: value }));

  return (
    <fieldset disabled={!editable || pending} className="space-y-3 rounded-md border p-3" data-testid={`wa-connection-${c.provider}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {c.label} · <span className="text-muted-foreground">{PROVIDERS[c.provider]}</span>
          </p>
          <p className="text-sm text-muted-foreground">{c.displayNumber ?? c.externalNumberId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} data-testid="wa-status">
            {tr(language, status.label)}
          </Badge>
          <Switch checked={c.enabled} onCheckedChange={(v) => toggle("enabled", v)} aria-label={tr(language, T.enabled)} />
        </div>
      </div>
      {errorText && <p className="text-sm text-destructive">{errorText}</p>}
      <CopyField label={tr(language, T.webhook)} value={c.webhookUrl} />
      <p className="text-xs text-muted-foreground">
        {tr(language, T.lastMessage)}: {c.lastInboundAt ? new Date(c.lastInboundAt).toLocaleString() : tr(language, T.never)}
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.copilotEnabled} onCheckedChange={(v) => toggle("copilotEnabled", v)} />
          {tr(language, T.copilot)}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.readReceipts} onCheckedChange={(v) => toggle("readReceipts", v)} disabled={c.provider === "twilio"} />
          {tr(language, T.receipts)}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.tipsEnabled} onCheckedChange={(v) => toggle("tipsEnabled", v)} />
          {tr(language, T.tips)}
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 sm:items-end">
        <div className="space-y-1">
          <Label htmlFor={`pu-${c.id}`}>{tr(language, T.perUser)}</Label>
          <Input id={`pu-${c.id}`} inputMode="numeric" value={perUser} onChange={(e) => setPerUser(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`oc-${c.id}`}>{tr(language, T.orgCap)}</Label>
          <Input id={`oc-${c.id}`} inputMode="numeric" value={orgCap} onChange={(e) => setOrgCap(e.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={() => run(() => updateConnectionAction(c.id, { dailyLimitPerUser: Number(perUser), orgDailyCap: Number(orgCap) }))}>
          {tr(language, T.saveLimits)}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" onClick={() => run(() => verifyConnectionAction(c.id), T.verified)} data-testid="wa-verify">
          <ShieldCheck className="mr-1 h-4 w-4" />
          {tr(language, T.verify)}
        </Button>
        <div className="space-y-1">
          <Label htmlFor={`to-${c.id}`} className="text-xs">
            {tr(language, T.testTo)}
          </Label>
          <div className="flex gap-2">
            <Input id={`to-${c.id}`} data-testid="wa-test-to" value={to} placeholder="2348012345678" onChange={(e) => setTo(e.target.value)} />
            <Button type="button" variant="outline" disabled={!to} onClick={() => run(() => testConnectionAction(c.id, to), T.sent)} data-testid="wa-send-test">
              <Send className="mr-1 h-4 w-4" />
              {tr(language, T.sendTest)}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => run(() => rotateConnectionAction(c.id), undefined, (res) => res.ok && res.secrets && onSecrets(res.secrets))}
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          {tr(language, T.rotate)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          onClick={() => window.confirm(tr(language, T.removeConfirm)) && run(() => deleteConnectionAction(c.id))}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {tr(language, T.remove)}
        </Button>
      </div>
    </fieldset>
  );
}
