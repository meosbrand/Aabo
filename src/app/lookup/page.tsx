import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LookupForm } from "@/components/check/lookup-form";

export const metadata: Metadata = {
  title: "Scam number & account lookup — Ààbò",
  description: "Check if a phone number, bank account, link or email has been reported as a scam in Nigeria.",
};

export default function LookupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <LookupForm />
      </main>
    </>
  );
}
