
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AaboLogo } from "@/components/aabo-logo";
import { ShieldCheck, Bot, FileClock, AlertTriangle, Settings, MessageCircle } from "lucide-react";

/**
 * An array of feature objects to be displayed on the landing page.
 */
const features = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: "Total Protection",
    description: "Keep your digital life safe with continuous monitoring and real-time alerts.",
  },
  {
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: "Ààbò Co-Pilot",
    description: "Your personal AI security assistant, ready to answer any question.",
  },
  {
    icon: <FileClock className="w-8 h-8 text-primary" />,
    title: "Secure Backups",
    description: "Automatically back up your important data and restore it anytime.",
  },
  {
    icon: <AlertTriangle className="w-8 h-8 text-primary" />,
    title: "Panic Trigger",
    description: "Instantly lock down your accounts and notify contacts in an emergency.",
  },
  {
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
    title: "WhatsApp Integration",
    description: "Receive critical security alerts directly on your WhatsApp.",
  },
  {
    icon: <Settings className="w-8 h-8 text-primary" />,
    title: "Easy to Manage",
    description: "Control all your security settings from one simple, clean dashboard.",
  },
];

/**
 * Renders the public landing page for the application.
 * It showcases the app's features, value proposition, and provides navigation to log in or sign up.
 * @returns {JSX.Element} The LandingPage component.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header section with logo and navigation */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <AaboLogo className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl text-foreground">Ààbò</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/onboarding">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight">
              Your Digital Guardian Angel
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Ààbò Digital Shield makes online security simple and accessible for everyone. Protect your accounts, data, and peace of mind with our friendly, powerful tools.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/onboarding">Protect Me Now</Link>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
          {/* Dashboard Preview Image */}
          <div className="mt-16 max-w-5xl mx-auto">
             <Image
                src="https://placehold.co/1200x600.png"
                alt="Ààbò Dashboard Preview"
                width={1200}
                height={600}
                className="rounded-xl shadow-2xl"
                data-ai-hint="friendly cartoon bot"
              />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Everything You Need, Nothing You Don't
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Ààbò is designed to be powerful yet simple. Here's how we keep you safe.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-card text-card-foreground shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>

                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="lg:w-1/2 text-center lg:text-left">
                    <h2 className="text-3xl md:text-4xl font-bold">Ready to Feel Secure?</h2>
                    <p className="mt-4 text-lg opacity-90">
                        Join thousands of others who trust Ààbò to protect their digital lives. Get started in minutes.
                    </p>
                </div>
                <div className="lg:w-1/2 flex justify-center lg:justify-end">
                    <Image src="https://placehold.co/400x400.png" alt="Market seller using phone" width={300} height={300} className="rounded-full shadow-lg" data-ai-hint="market seller" />
                </div>
            </div>
        </section>

      </main>

      {/* Footer Section */}
      <footer className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <AaboLogo className="h-6 w-6 text-foreground" />
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Ààbò Digital Shield. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
