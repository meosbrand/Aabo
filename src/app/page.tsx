"use client";

import Link from "next/link";
import { AlertTriangle, Bot, GraduationCap, MessageCircle, Search, ShieldCheck, Smartphone, Users } from "lucide-react";
import { AaboLogo } from "@/components/aabo-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";

const FEATURES = [
  {
    icon: Search,
    title: L("Check any message — free", "Check any message — free"),
    body: L(
      "Paste a WhatsApp message, SMS, link, QR code, screenshot or phone number. Get a clear verdict and what to do, in English or Pidgin.",
      "Paste WhatsApp message, SMS, link, QR code, screenshot or phone number. You go see clear answer and wetin to do, for English or Pidgin.",
    ),
  },
  {
    icon: ShieldCheck,
    title: L("WhatsApp Guardian", "WhatsApp Guardian"),
    body: L(
      "Link your WhatsApp once. Ààbò quietly checks incoming messages and warns you privately when a scam arrives — like Truecaller, for chats.",
      "Link your WhatsApp one time. Ààbò go dey check messages wey enter and warn you for private when scam land — like Truecaller, for chats.",
    ),
  },
  {
    icon: MessageCircle,
    title: L("Forward to Ààbò on WhatsApp & Telegram", "Forward give Ààbò for WhatsApp & Telegram"),
    body: L("Save Ààbò as a contact and forward anything suspicious. Reply REPORT to warn everyone else.", "Save Ààbò as contact and forward anything wey you no trust. Reply REPORT to warn everybody."),
  },
  {
    icon: Smartphone,
    title: L("Share from any app", "Share from any app"),
    body: L("Install Ààbò on your phone and use Share → Ààbò from WhatsApp, Messages, Instagram or Telegram.", "Install Ààbò for your phone and use Share → Ààbò from WhatsApp, Messages, Instagram or Telegram."),
  },
  {
    icon: Users,
    title: L("Built for businesses", "We build am for business"),
    body: L(
      "Catch fake transfer alerts and \"we changed our account\" supplier scams. Invite staff and see the scams hitting your team.",
      "Catch fake alert and \"we don change our account\" supplier scam. Invite your staff and see the scams wey dey hit your team.",
    ),
  },
  {
    icon: GraduationCap,
    title: L("2-minute lessons", "2-minute lessons"),
    body: L("Short, practical lessons and quizzes on the scams Nigerians face today.", "Short, practical lessons and quiz about the scams wey Nigerians dey face today."),
  },
  {
    icon: Bot,
    title: L("Ask the Digital Elder", "Ask Digital Baba"),
    body: L("An AI security assistant that answers your questions in plain language.", "AI security assistant wey go answer your question for simple language."),
  },
  {
    icon: AlertTriangle,
    title: L("When things go wrong", "When wahala happen"),
    body: L("Step-by-step playbooks for hijacked WhatsApp, money sent to scammers and more.", "Step-by-step guide for WhatsApp hijack, money wey you send give scammer and more."),
  },
];

const T = {
  hero: L("Stop scams before they cost your business.", "Stop scam before e cost your business."),
  sub: L(
    "Ààbò checks WhatsApp messages, SMS, links and numbers for Nigerian scams — fake alerts, BVN threats, code theft, fake suppliers — and teaches your team to spot them.",
    "Ààbò dey check WhatsApp messages, SMS, links and numbers for Nigerian scams — fake alert, BVN threat, code thief, fake supplier — and e dey teach your team how to catch dem.",
  ),
  check: L("Check a message now", "Check message now"),
  signup: L("Protect my business", "Protect my business"),
  signin: L("Sign in", "Enter"),
  features: L("Everything you need, nothing you don't", "Everything wey you need, nothing extra"),
  footer: L("Ààbò means protection.", "Ààbò mean protection."),
};

export default function LandingPage() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <AaboLogo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Ààbò</span>
        </Link>
        <nav className="flex items-center gap-1">
          <LanguageToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">{tr(language, T.signin)}</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center md:py-24">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">{tr(language, T.hero)}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{tr(language, T.sub)}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/check">
                <Search className="mr-2 h-5 w-5" />
                {tr(language, T.check)}
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login?mode=signup">{tr(language, T.signup)}</Link>
            </Button>
          </div>
        </section>

        <section className="bg-secondary py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-10 text-center text-3xl font-bold">{tr(language, T.features)}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <Card key={f.title.en}>
                  <CardHeader className="pb-2">
                    <f.icon className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle className="text-lg">{tr(language, f.title)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{tr(language, f.body)}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ààbò. {tr(language, T.footer)}
      </footer>
    </div>
  );
}
