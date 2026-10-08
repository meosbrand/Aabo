"use client";

import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";

const T = {
  title: L("Is this a scam?", "Na scam be this?"),
  sub: L(
    "Check any WhatsApp message, SMS, link, QR code or phone number — free, in seconds.",
    "Check any WhatsApp message, SMS, link, QR code or phone number — free, sharp sharp.",
  ),
  bot: L("Check scams right inside WhatsApp", "Check scam inside WhatsApp itself"),
  botSub: L(
    "Save Ààbò as a contact and forward any suspicious message to it.",
    "Save Ààbò number and forward any message wey you no trust give am.",
  ),
  botBtn: L("Chat with Ààbò on WhatsApp", "Chat Ààbò for WhatsApp"),
  tg: L("Use Telegram", "Use Telegram"),
  install: L(
    "Tip: install this page as an app (browser menu › Add to Home screen). Then you can Share any message straight to Ààbò.",
    "Tip: install this page like app (browser menu › Add to Home screen). Then you fit Share any message straight to Ààbò.",
  ),
};

export function CheckIntro() {
  const { language } = useLanguage();
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-extrabold tracking-tight">{tr(language, T.title)}</h1>
      <p className="text-muted-foreground">{tr(language, T.sub)}</p>
    </div>
  );
}

export function BotCta() {
  const { language } = useLanguage();
  const wa = process.env.NEXT_PUBLIC_WA_BOT_NUMBER;
  const tg = process.env.NEXT_PUBLIC_TELEGRAM_BOT;
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">{tr(language, T.bot)}</h2>
      <p className="text-sm text-muted-foreground">{tr(language, T.botSub)}</p>
      <div className="flex flex-wrap gap-2">
        {wa ? (
          <Button asChild className="bg-[#25D366] text-white hover:bg-[#1da851]">
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi Ààbò")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-1 h-4 w-4" aria-hidden />
              {tr(language, T.botBtn)}
            </a>
          </Button>
        ) : null}
        {tg ? (
          <Button asChild variant="outline">
            <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer">
              <Send className="mr-1 h-4 w-4" aria-hidden />
              {tr(language, T.tg)}
            </a>
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{tr(language, T.install)}</p>
    </section>
  );
}
