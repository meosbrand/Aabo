"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, ShieldCheck } from "lucide-react";
import { AaboLogo } from "@/components/aabo-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useLanguage, type Language } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";
import { completeOnboarding } from "@/app/app/actions";

const T = {
  s1: L("Tell us about your business", "Tell us about your business"),
  s1d: L("We use this to tailor alerts and lessons.", "We go use am arrange alerts and lessons for you."),
  business: L("Business name", "Business name"),
  lang: L("Preferred language", "Language wey you like"),
  next: L("Continue", "Continue"),
  s2: L("Protect your WhatsApp", "Protect your WhatsApp"),
  s2d: L("Pick one or both. You can change this later.", "Pick one or both. You fit change am later."),
  guardian: L("Turn on Guardian (automatic warnings)", "On Guardian (automatic warning)"),
  guardianD: L("Ààbò checks incoming WhatsApp messages and warns you privately.", "Ààbò go check messages wey enter your WhatsApp and warn you for private."),
  bot: L("Save the Ààbò bot (forward to check)", "Save Ààbò bot (forward make e check)"),
  botD: L("Forward any suspicious message to Ààbò on WhatsApp.", "Forward any message wey you no trust give Ààbò for WhatsApp."),
  s3: L("You're protected! 🎉", "You don dey protected! 🎉"),
  s3d: L("Next: do the 2-minute security checkup to raise your protection score.", "Next: do the 2-minute security checkup make your protection score go up."),
  dashboard: L("Go to dashboard", "Go dashboard"),
  checkup: L("Start security checkup", "Start security checkup"),
  skip: L("Skip for now", "Skip am for now"),
};

export function OnboardingFlow({ initialBusiness, initialLanguage, botNumber }: { initialBusiness: string; initialLanguage: Language; botNumber: string | null }) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState(initialBusiness);
  const [lang, setLang] = useState<Language>(initialLanguage);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-center gap-2 font-bold">
          <AaboLogo className="h-9 w-9 text-primary" /> Ààbò
        </div>
        <Progress value={((step + 1) / 3) * 100} className="h-2" />
        <Card className="shadow-xl">
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle>{tr(language, T.s1)}</CardTitle>
                <CardDescription>{tr(language, T.s1d)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-business">{tr(language, T.business)}</Label>
                  <Input id="ob-business" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Ada Stores, Balogun" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-lang">{tr(language, T.lang)}</Label>
                  <select id="ob-lang" value={lang} onChange={(e) => { setLang(e.target.value as Language); setLanguage(e.target.value as Language); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="en">English</option>
                    <option value="pidgin">Pidgin</option>
                  </select>
                </div>
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await completeOnboarding({ businessName: business, language: lang });
                      setStep(1);
                    })
                  }
                >
                  {tr(language, T.next)}
                </Button>
              </CardContent>
            </>
          )}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>{tr(language, T.s2)}</CardTitle>
                <CardDescription>{tr(language, T.s2d)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/app/guardian" className="flex gap-3 rounded-lg border p-4 hover:bg-secondary">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
                  <span>
                    <span className="block font-semibold">{tr(language, T.guardian)}</span>
                    <span className="text-sm text-muted-foreground">{tr(language, T.guardianD)}</span>
                  </span>
                </Link>
                {botNumber && (
                  <a href={`https://wa.me/${botNumber}?text=${encodeURIComponent("Hi Ààbò")}`} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-lg border p-4 hover:bg-secondary">
                    <MessageCircle className="h-6 w-6 shrink-0 text-[#25D366]" />
                    <span>
                      <span className="block font-semibold">{tr(language, T.bot)}</span>
                      <span className="text-sm text-muted-foreground">{tr(language, T.botD)}</span>
                    </span>
                  </a>
                )}
                <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
                  {tr(language, T.skip)}
                </Button>
              </CardContent>
            </>
          )}
          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle>{tr(language, T.s3)}</CardTitle>
                <CardDescription>{tr(language, T.s3d)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button onClick={() => router.push("/app/checkup")}>{tr(language, T.checkup)}</Button>
                <Button variant="outline" onClick={() => router.push("/app/dashboard")}>
                  {tr(language, T.dashboard)}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
