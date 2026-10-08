"use client";

import Link from "next/link";
import { AaboLogo } from "@/components/aabo-logo";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/lib/auth-client";
import { L, tr } from "@/lib/i18n";

const T = {
  check: L("Check", "Check"),
  lookup: L("Lookup", "Find number"),
  learn: L("Learn", "Learn"),
  signIn: L("Sign in", "Enter"),
  app: L("My dashboard", "My dashboard"),
};

/** Public header used on the free pages (check, lookup, learn). */
export function SiteHeader() {
  const { language } = useLanguage();
  const { data: session } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <AaboLogo className="h-7 w-7 text-primary" />
          <span>Ààbò</span>
        </Link>
        <nav className="ml-2 flex items-center gap-1 text-sm">
          <Link className="rounded px-2 py-1 hover:bg-secondary" href="/check">{tr(language, T.check)}</Link>
          <Link className="rounded px-2 py-1 hover:bg-secondary" href="/lookup">{tr(language, T.lookup)}</Link>
          <Link className="hidden rounded px-2 py-1 hover:bg-secondary sm:inline" href="/learn">{tr(language, T.learn)}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle />
          <Button asChild size="sm" variant={session ? "secondary" : "default"}>
            <Link href={session ? "/app/dashboard" : "/login"}>{tr(language, session ? T.app : T.signIn)}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
