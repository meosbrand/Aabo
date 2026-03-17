
"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  FileClock,
  Bot,
  AlertTriangle,
  Settings,
  LifeBuoy,
  LogOut,
  Languages,
  User,
} from "lucide-react";
import { AaboLogo } from "@/components/aabo-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

/**
 * The main content layout for the authenticated part of the application.
 * It includes the collapsible sidebar, top header bar, and the main content area.
 * It uses the LanguageContext to provide translations.
 * @param {{ children: React.ReactNode }} props - The component props.
 * @returns {JSX.Element} The AppLayoutContent component.
 */
const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  /**
   * The navigation items for the sidebar menu.
   * Uses the translation context to get the correct labels.
   */
  const menuItems = [
    { href: "/app/dashboard", icon: LayoutDashboard, label: t.sidebar[language].dashboard },
    { href: "/app/backup", icon: FileClock, label: t.sidebar[language].backup },
    { href: "/app/copilot", icon: Bot, label: t.sidebar[language].copilot },
    { href: "/app/panic", icon: AlertTriangle, label: t.sidebar[language].panic },
  ];

  const bottomMenuItems = [
    { href: "/app/profile", icon: User, label: t.sidebar[language].profile },
    { href: "/app/settings", icon: Settings, label: t.sidebar[language].settings },
  ]

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <AaboLogo className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Ààbò
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{children: item.label}}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
              {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      tooltip={{children: item.label}}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                 <Link href="/login">
                    <SidebarMenuButton tooltip={{children: t.sidebar[language].logout}}>
                        <LogOut />
                        <span>{t.sidebar[language].logout}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Header bar at the top of the content area */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          {/* Hamburger menu trigger for mobile */}
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1">
            {/* This space can be used for a page title if needed */}
          </div>
          <div className="flex items-center gap-4">
            {/* Language switcher dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Languages className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('pidgin')}>Pidgin</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* User profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person smiling" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Main content area where page content is rendered */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

/**
 * The root layout for the authenticated part of the app ('/app/**').
 * It wraps the main layout content with the LanguageProvider to enable
 * language switching functionality across all nested pages.
 * @param {{ children: React.ReactNode }} props - The component props.
 * @returns {JSX.Element} The AppLayout component.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </LanguageProvider>
  );
}
