"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AaboLogo } from "@/components/aabo-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/context/LanguageContext";
import { signIn, signUp } from "@/lib/auth-client";
import { L, tr } from "@/lib/i18n";

const T = {
  welcome: L("Welcome back", "Welcome back"),
  create: L("Create your free account", "Open your free account"),
  sub: L("Protect your business and staff from scams.", "Protect your business and your staff from scam."),
  name: L("Your name", "Your name"),
  business: L("Business name (optional)", "Business name (optional)"),
  email: L("Email", "Email"),
  password: L("Password (8+ characters)", "Password (8 letters or more)"),
  signIn: L("Sign in", "Enter"),
  signUp: L("Create account", "Open account"),
  google: L("Continue with Google", "Continue with Google"),
  haveAccount: L("Already have an account?", "You don get account?"),
  noAccount: L("New to Ààbò?", "You new for Ààbò?"),
  switchToSignIn: L("Sign in", "Enter"),
  switchToSignUp: L("Create a free account", "Open free account"),
  checkFree: L("Just want to check a message? No account needed →", "You just wan check message? No need account →"),
};

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const { language } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [form, setForm] = useState({ name: "", business: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res =
      mode === "signin"
        ? await signIn.email({ email: form.email, password: form.password })
        : await signUp.email({ email: form.email, password: form.password, name: form.name || form.email.split("@")[0] });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong");
      return;
    }
    if (mode === "signup") {
      const q = new URLSearchParams({ business: form.business, lang: language });
      router.push(`/onboarding?${q.toString()}`);
    } else {
      router.push(next);
    }
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <AaboLogo className="h-8 w-8 text-primary" />
            Ààbò
          </Link>
          <LanguageToggle />
        </div>
        <CardTitle className="text-2xl font-bold">{tr(language, mode === "signin" ? T.welcome : T.create)}</CardTitle>
        <CardDescription>{tr(language, T.sub)}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{tr(language, T.name)}</Label>
                <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business">{tr(language, T.business)}</Label>
                <Input id="business" autoComplete="organization" value={form.business} onChange={set("business")} />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{tr(language, T.email)}</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{tr(language, T.password)}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              value={form.password}
              onChange={set("password")}
              required
            />
          </div>
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tr(language, mode === "signin" ? T.signIn : T.signUp)}
          </Button>
        </form>
        {googleEnabled && (
          <>
            <div className="relative my-5">
              <Separator />
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card px-2 text-sm text-muted-foreground">OR</span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => signIn.social({ provider: "google", callbackURL: next })}>
              {tr(language, T.google)}
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-sm">
        <p>
          {tr(language, mode === "signin" ? T.noAccount : T.haveAccount)}{" "}
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {tr(language, mode === "signin" ? T.switchToSignUp : T.switchToSignIn)}
          </button>
        </p>
        <Link href="/check" className="text-muted-foreground hover:underline">
          {tr(language, T.checkFree)}
        </Link>
      </CardFooter>
    </Card>
  );
}
