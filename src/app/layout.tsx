import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

/**
 * Metadata for the entire application.
 * This is used by Next.js to set the title and description in the HTML head.
 */
export const metadata: Metadata = {
  title: "Ààbò Digital Shield",
  description: "Your friendly guardian in the digital world.",
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
        {/* Render the active page content */}
        {children}
        {/* Render the Toaster component to display notifications */}
        <Toaster />
      </body>
    </html>
  );
}