import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/context/LanguageContext";
import { PwaRegister } from "@/components/pwa-register";

/**
 * Metadata for the entire application.
 * This is used by Next.js to set the title and description in the HTML head.
 */
export const metadata: Metadata = {
  title: "Ààbò — Scam Shield for Nigerian businesses",
  description: "Check WhatsApp messages, SMS, links and numbers for scams, in English or Pidgin. Protect your business and staff.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ààbò",
  appleWebApp: { capable: true, title: "Ààbò", statusBarStyle: "default" },
  icons: { icon: "/favicon.ico", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#005B4A",
  width: "device-width",
  initialScale: 1,
};

/**
 * The root layout for the entire application.
 * This component wraps all pages and includes global styles, fonts, and the Toaster component for notifications.
 * @param {{ children: React.ReactNode }} props - The component props, which include the page content to be rendered.
 * @returns {JSX.Element} The root layout component.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Import the Inter font family */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans")}>
        {/* Render the active page content with English/Pidgin support everywhere */}
        <LanguageProvider>{children}</LanguageProvider>
        {/* Render the Toaster component to display notifications */}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}