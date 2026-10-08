"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bot, ChevronDown, Cpu, KeyRound, ScrollText, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { AI_PRESETS, isAiProviderId, type AiProviderId, type JsonMode } from "@/lib/ai-presets";
import type { AiTestCode, AiTestResult, DeveloperOverview, IntegrationView } from "@/lib/developer-types";
import { L, tr } from "@/lib/i18n";
import { WhatsAppConnections } from "@/components/app/whatsapp-connections";
import { DEV_ERROR_TEXT } from "@/lib/developer-text";
import {
  saveAiAction,
  saveIntelKeyAction,
  testAiAction,
  toggleDeveloperModeAction,
  type DevActionResult,
} from "@/app/app/developer/actions";

type Mode = "platform" | "byok" | "off";

const T = {
  title: L("Developer", "Developer"),
  sub: L("Bring your own AI model, threat-intel keys and WhatsApp API.", "Bring your own AI model, threat-intel keys and WhatsApp API."),
  devMode: L("Developer Mode", "Developer Mode"),
  devModeSub: L("Lets owners and admins of this business plug in their own providers. Keys are encrypted and never shown again.", "E dey allow owners and admins plug their own providers. We dey lock (encrypt) the keys and we no go show dem again."),
  ownerOnly: L("Only the business owner can switch Developer Mode on or off.", "Na only the business owner fit on or off Developer Mode."),
  operatorOff: L("Developer Mode is turned off on this server.", "Dem don off Developer Mode for this server."),
  noKeys: L("This server cannot store secrets yet. Ask the operator to set AABO_SECRET_KEYS.", "This server never fit keep secrets. Tell the operator make dem set AABO_SECRET_KEYS."),
  confirmTitle: L("Turn on Developer Mode?", "On Developer Mode?"),
  confirmBody: L(
    "Owners and admins will be able to connect their own AI provider and API keys. Messages checked for your business may be sent to the providers you choose.",
    "Owners and admins go fit connect their own AI provider and API keys. Messages wey una check fit go to the providers wey una choose.",
  ),
  confirm: L("Turn on", "On am"),
  cancel: L("Cancel", "Cancel"),
  engine: L("Detection engine", "Detection engine"),
  engineFallback: L("The configured engine could not load; the community engine is running.", "The engine wey dem set no load; community engine dey run."),
  ai: L("AI provider", "AI provider"),
  aiSub: L("Used for unclear messages, reading screenshots and Co-pilot answers.", "We dey use am for messages wey no clear, to read screenshots and for Co-pilot answers."),
  modePlatform: L("Ààbò's AI", "Ààbò AI"),
  modeByok: L("Our own key", "Our own key"),
  modeOff: L("No AI", "No AI"),
  platformOn: L("Using Ààbò's AI", "We dey use Ààbò AI"),
  platformMissing: L("Ààbò's AI is not set up on this server, so checks use rules only.", "Ààbò AI never set for this server, so checks dey use rules only."),
  offNote: L("Checks run on rules, reputation and threat feeds only. Co-pilot answers with saved tips.", "Checks go use rules, reputation and threat feeds only. Co-pilot go answer with saved tips."),
  byokNote: L("Your messages go only to your provider. If it fails, checks continue without AI — never on Ààbò's key.", "Your messages go only to your provider. If e fail, checks go continue without AI — never with Ààbò key."),
  provider: L("Provider", "Provider"),
  baseURL: L("API base URL", "API base URL"),
  model: L("Model", "Model"),
  apiKey: L("API key", "API key"),
  keepKey: L("leave blank to keep", "leave am empty to keep am"),
  advanced: L("Advanced", "Advanced"),
  visionModel: L("Model for screenshots (optional)", "Model for screenshots (optional)"),
  jsonMode: L("JSON mode", "JSON mode"),
  vision: L("Model can read images", "Model fit read pictures"),
  temperature: L("Temperature (blank = default)", "Temperature (empty = default)"),
  save: L("Save", "Save"),
  saved: L("Saved", "We don save am"),
  test: L("Test connection", "Test connection"),
  testing: L("Testing…", "We dey test…"),
  intel: L("Threat-intel keys", "Threat-intel keys"),
  intelSub: L("Your own Google Safe Browsing and URLhaus keys. Without them, Ààbò's keys (if any) are used.", "Your own Google Safe Browsing and URLhaus keys. If you no put am, we go use Ààbò own (if e dey)."),
  remove: L("Remove", "Comot am"),
  whatsapp: L("WhatsApp", "WhatsApp"),
  whatsappSub: L("Ààbò's built-in WhatsApp (linked device) works without any setup.", "Ààbò built-in WhatsApp (linked device) dey work without any setup."),
  openGuardian: L("Open WhatsApp Guardian", "Open WhatsApp Guardian"),
  apiKeys: L("API keys for your own systems are in Settings.", "API keys for your own systems dey for Settings."),
  openSettings: L("Open Settings", "Open Settings"),
  audit: L("Recent changes", "Wetin change recently"),
  noAudit: L("No changes yet.", "Nothing don change yet."),
  storedKey: L("Saved key", "Saved key"),
};

const TEST_TEXT: Record<AiTestCode, { en: string; pidgin: string }> = {
  ok: L("Connected", "E don connect"),
  auth_failed: L("The provider rejected the key", "The provider reject the key"),
  model_not_found: L("Model not found — check the model name", "We no see that model — check the model name"),
  unreachable: L("Could not reach the server", "We no fit reach the server"),
  blocked_address: L("That address is not allowed (private network)", "That address no allowed (private network)"),
  bad_response: L("The model did not answer in the expected format", "The model no answer the way we expect"),
  timeout: L("The provider took too long to answer", "The provider take too long to answer"),
  rate_limited: L("The provider is rate-limiting this key", "The provider dey limit this key"),
};


function statusBadge(status: string, language: "en" | "pidgin") {
  const map: Record<string, { label: { en: string; pidgin: string }; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    verified: { label: L("Verified", "Verified"), variant: "default" },
    unverified: { label: L("Not tested", "We never test am"), variant: "secondary" },
    error: { label: L("Error", "Error"), variant: "destructive" },
  };
  const s = map[status] ?? { label: L(status, status), variant: "outline" as const };
  return <Badge variant={s.variant}>{tr(language, s.label)}</Badge>;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function DeveloperView({ overview }: { overview: DeveloperOverview }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ai = overview.integrations.find((i) => i.kind === "ai");
  const cfg = ai?.config ?? {};
  const [mode, setMode] = useState<Mode>((cfg.mode as Mode) ?? "platform");
  const [provider, setProvider] = useState<AiProviderId>(isAiProviderId(cfg.provider) ? cfg.provider : "openai");
  const [baseURL, setBaseURL] = useState(str(cfg.baseURL));
  const [model, setModel] = useState(str(cfg.model));
  const [apiKey, setApiKey] = useState("");
  const [visionModel, setVisionModel] = useState(str(cfg.visionModel));
  const [jsonMode, setJsonMode] = useState<JsonMode | "default">((cfg.jsonMode as JsonMode) ?? "default");
  const [vision, setVision] = useState<boolean | null>(typeof cfg.vision === "boolean" ? cfg.vision : null);
  const [temperature, setTemperature] = useState(typeof cfg.temperature === "number" ? String(cfg.temperature) : "");
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  const preset = AI_PRESETS[provider];
  const editable = overview.developerMode && overview.secretsAvailable;
  const isOwner = overview.role === "owner";

  const report = (res: DevActionResult, okTitle?: { en: string; pidgin: string }) => {
    if (res.ok) {
      if (okTitle) toast({ title: tr(language, okTitle) });
      return true;
    }
    toast({ variant: "destructive", title: res.message ?? tr(language, DEV_ERROR_TEXT[res.code]) });
    return false;
  };

  const draft = () => ({
    mode,
    provider,
    baseURL: baseURL || undefined,
    model: model || undefined,
    visionModel: visionModel || undefined,
    jsonMode: jsonMode === "default" ? undefined : jsonMode,
    vision,
    temperature: temperature.trim() === "" ? null : Number(temperature),
    apiKey: apiKey || undefined,
  });

  const toggle = (on: boolean) =>
    start(async () => {
      report(await toggleDeveloperModeAction(on), on ? L("Developer Mode is on", "Developer Mode don on") : L("Developer Mode is off", "Developer Mode don off"));
    });

  const saveAi = () =>
    start(async () => {
      if (report(await saveAiAction(draft()), T.saved)) setApiKey("");
    });

  const testAi = () =>
    start(async () => {
      setTestResult(null);
      const res = await testAiAction(draft());
      if (res.ok && res.result) setTestResult(res.result);
      else report(res);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Wrench className="h-7 w-7 text-primary" />
          {tr(language, T.title)}
        </h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{tr(language, T.devMode)}</CardTitle>
            <CardDescription>{tr(language, T.devModeSub)}</CardDescription>
          </div>
          <Switch
            data-testid="devmode-switch"
            checked={overview.developerMode}
            disabled={pending || !isOwner || (!overview.developerMode && (!overview.allowed || !overview.secretsAvailable))}
            onCheckedChange={(on) => (on ? setConfirmOpen(true) : toggle(false))}
            aria-label={tr(language, T.devMode)}
          />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!isOwner && <p className="text-muted-foreground">{tr(language, T.ownerOnly)}</p>}
          {!overview.allowed && <p className="text-destructive">{tr(language, T.operatorOff)}</p>}
          {overview.allowed && !overview.secretsAvailable && <p className="text-destructive">{tr(language, T.noKeys)}</p>}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(language, T.confirmTitle)}</AlertDialogTitle>
            <AlertDialogDescription>{tr(language, T.confirmBody)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(language, T.cancel)}</AlertDialogCancel>
            <AlertDialogAction data-testid="devmode-confirm" onClick={() => toggle(true)}>
              {tr(language, T.confirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {overview.engine && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-5 w-5 text-primary" />
              {tr(language, T.engine)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p data-testid="engine-id">
              {overview.engine.id} {overview.engine.version}
            </p>
            {overview.engine.fallback && <p className="text-destructive">{tr(language, T.engineFallback)}</p>}
          </CardContent>
        </Card>
      )}

      <fieldset disabled={!editable || pending} className="space-y-6 disabled:opacity-60">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {tr(language, T.ai)}
              {ai && mode === "byok" && statusBadge(ai.status, language)}
            </CardTitle>
            <CardDescription>{tr(language, T.aiSub)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr(language, T.ai)}>
              {(["platform", "byok", "off"] as Mode[]).map((m) => (
                <Button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  data-testid={`ai-mode-${m}`}
                  variant={mode === m ? "default" : "outline"}
                  onClick={() => setMode(m)}
                >
                  {tr(language, m === "platform" ? T.modePlatform : m === "byok" ? T.modeByok : T.modeOff)}
                </Button>
              ))}
            </div>

            {mode === "platform" && (
              <p className="text-sm text-muted-foreground">
                {overview.platformAi.available ? `${tr(language, T.platformOn)} (${overview.platformAi.provider} · ${overview.platformAi.model})` : tr(language, T.platformMissing)}
              </p>
            )}
            {mode === "off" && <p className="text-sm text-muted-foreground">{tr(language, T.offNote)}</p>}

            {mode === "byok" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{tr(language, T.byokNote)}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="ai-provider">{tr(language, T.provider)}</Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as AiProviderId)}>
                      <SelectTrigger id="ai-provider" data-testid="ai-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(AI_PRESETS).map((p) => (
                          <SelectItem key={p.id} value={p.id} data-testid={`ai-provider-${p.id}`}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ai-model">{tr(language, T.model)}</Label>
                    <Input id="ai-model" data-testid="ai-model" value={model} placeholder={preset.model || "model-name"} onChange={(e) => setModel(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="ai-base">{tr(language, T.baseURL)}</Label>
                    <Input id="ai-base" data-testid="ai-base-url" value={baseURL} placeholder={preset.baseURL || "https://…/v1"} onChange={(e) => setBaseURL(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="ai-key" className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      {tr(language, T.apiKey)}
                      {ai?.hint && (
                        <span className="text-xs font-normal text-muted-foreground" data-testid="ai-key-hint">
                          {tr(language, T.storedKey)} {ai.hint} — {tr(language, T.keepKey)}
                        </span>
                      )}
                    </Label>
                    <Input
                      id="ai-key"
                      data-testid="ai-key"
                      type="password"
                      autoComplete="off"
                      value={apiKey}
                      placeholder={ai?.hint ? `${ai.hint}` : preset.keyRequired ? "sk-…" : ""}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="px-0">
                      {tr(language, T.advanced)} <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid gap-4 pt-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="ai-vision-model">{tr(language, T.visionModel)}</Label>
                      <Input id="ai-vision-model" value={visionModel} onChange={(e) => setVisionModel(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ai-json">{tr(language, T.jsonMode)}</Label>
                      <Select value={jsonMode} onValueChange={(v) => setJsonMode(v as JsonMode | "default")}>
                        <SelectTrigger id="ai-json">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">default ({preset.jsonMode})</SelectItem>
                          <SelectItem value="json_schema">json_schema</SelectItem>
                          <SelectItem value="json_object">json_object</SelectItem>
                          <SelectItem value="prompt">prompt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="ai-vision" checked={vision ?? preset.vision} onCheckedChange={(v) => setVision(v)} />
                      <Label htmlFor="ai-vision">{tr(language, T.vision)}</Label>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ai-temp">{tr(language, T.temperature)}</Label>
                      <Input id="ai-temp" inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" data-testid="ai-save" onClick={saveAi}>
                {tr(language, T.save)}
              </Button>
              {mode !== "off" && (
                <Button type="button" variant="outline" data-testid="ai-test" onClick={testAi}>
                  {pending ? tr(language, T.testing) : tr(language, T.test)}
                </Button>
              )}
              {testResult && (
                <span data-testid="ai-test-result" className={`flex items-center gap-1 text-sm ${testResult.ok ? "text-emerald-700" : "text-destructive"}`}>
                  {testResult.ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {tr(language, TEST_TEXT[testResult.code])}
                  {testResult.ok && ` · ${testResult.latencyMs} ms · ${testResult.jsonMode}${testResult.vision === null ? "" : testResult.vision ? " · images ✓" : " · images ✗"}`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <IntelKeys integrations={overview.integrations} onResult={report} />
      </fieldset>

      <Card>
        <CardHeader>
          <CardTitle>{tr(language, T.whatsapp)}</CardTitle>
          <CardDescription>{tr(language, T.whatsappSub)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button asChild variant="outline">
            <Link href="/app/guardian">{tr(language, T.openGuardian)}</Link>
          </Button>
          <WhatsAppConnections connections={overview.connections} editable={editable} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span>{tr(language, T.apiKeys)}</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/settings">{tr(language, T.openSettings)}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-5 w-5 text-primary" />
            {tr(language, T.audit)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview.audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr(language, T.noAudit)}</p>
          ) : (
            <ul className="space-y-1 text-sm" data-testid="audit-log">
              {overview.audit.map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>
                    <span className="font-medium">{a.actor}</span> · {a.action}
                    {a.target ? ` · ${a.target}` : ""}
                  </span>
                  <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntelKeys({ integrations, onResult }: { integrations: IntegrationView[]; onResult: (res: DevActionResult, okTitle?: { en: string; pidgin: string }) => boolean }) {
  const { language } = useLanguage();
  const [pending, start] = useTransition();
  const [keys, setKeys] = useState<Record<string, string>>({ safebrowsing: "", urlhaus: "" });
  const rows: Array<{ kind: "safebrowsing" | "urlhaus"; label: string }> = [
    { kind: "safebrowsing", label: "Google Safe Browsing" },
    { kind: "urlhaus", label: "URLhaus (abuse.ch)" },
  ];

  const save = (kind: "safebrowsing" | "urlhaus", value: string | null) =>
    start(async () => {
      if (onResult(await saveIntelKeyAction(kind, value), T.saved)) setKeys((k) => ({ ...k, [kind]: "" }));
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {tr(language, T.intel)}
        </CardTitle>
        <CardDescription>{tr(language, T.intelSub)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => {
          const stored = integrations.find((i) => i.kind === r.kind);
          return (
            <div key={r.kind} className="space-y-1">
              <Label htmlFor={`intel-${r.kind}`}>
                {r.label}
                {stored?.hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{tr(language, T.storedKey)} {stored.hint}</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`intel-${r.kind}`}
                  type="password"
                  autoComplete="off"
                  value={keys[r.kind]}
                  placeholder={stored?.hint ?? ""}
                  onChange={(e) => setKeys((k) => ({ ...k, [r.kind]: e.target.value }))}
                />
                <Button type="button" disabled={pending || !keys[r.kind]} onClick={() => save(r.kind, keys[r.kind])}>
                  {tr(language, T.save)}
                </Button>
                {stored && (
                  <Button type="button" variant="outline" disabled={pending} onClick={() => save(r.kind, null)}>
                    {tr(language, T.remove)}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
