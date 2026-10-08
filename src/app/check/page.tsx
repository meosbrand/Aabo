import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CheckForm } from "@/components/check/check-form";
import { CheckIntro, BotCta } from "@/components/check/check-intro";

export const metadata: Metadata = {
  title: "Is this a scam? — Ààbò free scam checker",
  description: "Paste any WhatsApp message, SMS, link or phone number and Ààbò tells you if it is a scam — in English or Pidgin.",
};

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ text?: string }> }) {
  const { text } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <CheckIntro />
        <CheckForm initialText={typeof text === "string" ? text.slice(0, 6000) : ""} />
        <BotCta />
      </main>
    </>
  );
}
