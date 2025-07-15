
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
} from "@/components/ui/sidebar";

const AppLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  const menuItems = [
    { href: "/app/dashboard", icon: LayoutDashboard, label: t.sidebar[language].dashboard },
    { href: "/app/backup", icon: FileClock, label: t.sidebar[language].backup },
    { href: "/app/copilot", icon: Bot, label: t.sidebar[language].copilot },
    { href: "/app/panic", icon: AlertTriangle, label: t.sidebar[language].panic },
    { href: "/app/settings", icon: Settings, label: t.sidebar[language].settings },
  ];

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
                <Link href={item.href}>
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
              <SidebarMenuItem>
                 <Link href="#">
                    <SidebarMenuButton tooltip={{children: t.sidebar[language].support}}>
                        <LifeBuoy/>
                        <span>{t.sidebar[language].support}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
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
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="w-full flex-1">
            {/* You can add a page title here if needed */}
          </div>
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
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person smiling" />
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
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </LanguageProvider>
  );
}
