import { OnboardingFlow } from "@/components/app/onboarding-flow";

export const metadata = { title: "Welcome — Ààbò" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ business?: string; lang?: string }> }) {
  const sp = await searchParams;
  return (
    <OnboardingFlow
      initialBusiness={sp.business ?? ""}
      initialLanguage={sp.lang === "pidgin" ? "pidgin" : "en"}
      botNumber={process.env.NEXT_PUBLIC_WA_BOT_NUMBER ?? null}
    />
  );
}
