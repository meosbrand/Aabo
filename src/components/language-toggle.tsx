"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

/** One-tap English ⇄ Pidgin switch. */
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "en" ? "pidgin" : "en")}
      aria-label="Switch language"
    >
      <Languages className="mr-1 h-4 w-4" aria-hidden />
      {language === "en" ? "Pidgin" : "English"}
    </Button>
  );
}
