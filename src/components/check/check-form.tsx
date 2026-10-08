"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { ClipboardPaste, ImagePlus, Loader2, QrCode, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VerdictCard } from "@/components/verdict-card";
import { QrScanner } from "@/components/check/qr-scanner";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";
import { checkAction, type CheckResult } from "@/app/check/actions";

const T = {
  label: L("Paste the message, link or phone number", "Paste the message, link or phone number"),
  placeholder: L(
    "e.g. “Your BVN has been suspended, click here to update…”",
    "e.g. “Dem don block your BVN, click here make you update…”",
  ),
  where: L("Where did you get it?", "Where you see am?"),
  check: L("Check now", "Check am now"),
  checking: L("Checking…", "We dey check…"),
  paste: L("Paste", "Paste"),
  screenshot: L("Add screenshot", "Add screenshot"),
  qr: L("Scan QR code", "Scan QR code"),
  qrFound: L("QR code found in your screenshot:", "We see QR code for your screenshot:"),
  privacy: L(
    "We keep only a short, masked excerpt to improve scam detection. Never paste passwords or PINs.",
    "We dey keep only small part of the message (we hide numbers) to make detection better. No paste password or PIN.",
  ),
};

const CONTEXTS = [
  { value: "", label: L("Choose (optional)", "Choose (optional)") },
  { value: "WhatsApp from an unknown number", label: L("WhatsApp — unknown number", "WhatsApp — number wey I no know") },
  { value: "WhatsApp from a saved contact", label: L("WhatsApp — someone I know", "WhatsApp — person wey I know") },
  { value: "WhatsApp group", label: L("WhatsApp group", "WhatsApp group") },
  { value: "SMS", label: L("SMS / text message", "SMS / text") },
  { value: "Phone call", label: L("Phone call", "Phone call") },
  { value: "Instagram / Facebook / TikTok", label: L("Instagram / Facebook / TikTok", "Instagram / Facebook / TikTok") },
  { value: "Email", label: L("Email", "Email") },
  { value: "In person / at my shop", label: L("In person / at my shop", "For my shop / face to face") },
];

async function decodeQrFromFile(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height)?.data ?? null;
  } catch {
    return null;
  }
}

export function CheckForm({ initialText = "" }: { initialText?: string }) {
  const { language } = useLanguage();
  const [text, setText] = useState(initialText);
  const [context, setContext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [qrFromImage, setQrFromImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(
    (overrideText?: string) => {
      const fd = new FormData();
      const body = [overrideText ?? text, qrFromImage ? `QR code: ${qrFromImage}` : ""].filter(Boolean).join("\n");
      fd.set("text", body);
      fd.set("context", context);
      if (file) fd.set("screenshot", file);
      start(async () => {
        const res = await checkAction(fd);
        setResult(res);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      });
    },
    [text, qrFromImage, context, file],
  );

  const onPaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip);
    } catch {
      // Clipboard permission denied: the user can long-press and paste.
    }
  };

  const onFile = async (f: File | null) => {
    setFile(f);
    setQrFromImage(f ? await decodeQrFromFile(f) : null);
  };

  const onQr = useCallback(
    (value: string) => {
      setScanning(false);
      const next = `QR code: ${value}`;
      setText(next);
      submit(next);
    },
    [submit],
  );

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="check-text" className="text-base">
            {tr(language, T.label)}
          </Label>
          <Textarea
            id="check-text"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr(language, T.placeholder)}
            rows={6}
            maxLength={6000}
            className="text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPaste}>
            <ClipboardPaste className="mr-1 h-4 w-4" aria-hidden />
            {tr(language, T.paste)}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="mr-1 h-4 w-4" aria-hidden />
            {tr(language, T.screenshot)}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setScanning((s) => !s)}>
            <QrCode className="mr-1 h-4 w-4" aria-hidden />
            {tr(language, T.qr)}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
            <span className="truncate">📎 {file.name}</span>
            <Button type="button" size="icon" variant="ghost" className="ml-auto h-6 w-6" onClick={() => onFile(null)} aria-label="Remove screenshot">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {qrFromImage && (
          <p className="break-all rounded-md bg-secondary px-3 py-2 text-sm">
            {tr(language, T.qrFound)} <span className="font-mono">{qrFromImage}</span>
          </p>
        )}
        {scanning && <QrScanner onResult={onQr} onClose={() => setScanning(false)} />}

        <div className="space-y-2">
          <Label htmlFor="check-context">{tr(language, T.where)}</Label>
          <select
            id="check-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CONTEXTS.map((c) => (
              <option key={c.value} value={c.value}>
                {tr(language, c.label)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="lg" className="w-full text-base" disabled={pending || (!text.trim() && !file)}>
          {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : <Search className="mr-2 h-5 w-5" aria-hidden />}
          {tr(language, pending ? T.checking : T.check)}
        </Button>
        <p className="text-xs text-muted-foreground">{tr(language, T.privacy)}</p>
      </form>

      <div ref={resultRef}>
        {result && !result.ok && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{result.error}</p>}
        {result && result.ok && <VerdictCard verdict={result.verdict} scanId={result.scanId} seenCount={result.seenCount} />}
      </div>
    </div>
  );
}
