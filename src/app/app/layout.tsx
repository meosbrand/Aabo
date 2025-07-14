
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
  PanelLeft,
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
  useSidebar,
} from "@/components/ui/sidebar";

const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { state } = useSidebar();

  const menuItems = [
    { href: "/app/dashboard", icon: LayoutDashboard, label: t.sidebar.dashboard },
    { href: "/app/backup", icon: FileClock, label: t.sidebar.backup },
    { href: "/app/copilot", icon: Bot, label: t.sidebar.copilot },
    { href: "/app/panic", icon: AlertTriangle, label: t.sidebar.panic },
    { href: "/app/settings", icon: Settings, label: t.sidebar.settings },
  ];

  const currentLabel = menuItems.find(item => pathname.startsWith(item.href))?.label || 'Ààbò';

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar>
        <SidebarHeader>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <AaboLogo className="h-6 w-6 text-primary" />
              <span className={state === 'collapsed' ? 'hidden' : 'inline'}>Ààbò</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                 <Link href={item.href} className="w-full">
                    <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={{children: item.label}}>
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
                <SidebarMenuItem>
                    <Link href="#" className="w-full">
                        <SidebarMenuButton tooltip={{children: t.sidebar.support}}>
                            <LifeBuoy />
                            <span>{t.sidebar.support}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/login" className="w-full">
                        <SidebarMenuButton tooltip={{children: t.sidebar.logout}}>
                            <LogOut />
                            <span>{t.sidebar.logout}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
           <SidebarTrigger className="sm:hidden">
              <PanelLeft />
           </SidebarTrigger>

          <h1 className="text-xl font-semibold md:text-2xl flex-1">{currentLabel}</h1>
          
          <div className="flex items-center gap-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar>
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person smiling"/>
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 bg-muted/40 sm:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </LanguageProvider>
  );
}
