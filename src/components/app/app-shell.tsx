"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  Code2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { AaboLogo } from "@/components/aabo-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/context/LanguageContext";
import { signOut } from "@/lib/auth-client";
import { L, tr } from "@/lib/i18n";

export interface ShellUser {
  name: string;
  email: string;
  role: string;
  /** Role in the user's organisation; owners and admins see Developer settings. */
  orgRole?: "owner" | "admin" | "member" | null;
  businessName: string | null;
  unreadAlerts: number;
}

const NAV = [
  { href: "/app/dashboard", icon: LayoutDashboard, label: L("Dashboard", "Your level") },
  { href: "/app/copilot", icon: Bot, label: L("Check & ask", "Check & ask") },
  { href: "/app/guardian", icon: ShieldCheck, label: L("WhatsApp Guardian", "WhatsApp Guardian") },
  { href: "/app/learn", icon: GraduationCap, label: L("Learn", "Learn") },
  { href: "/app/team", icon: Users, label: L("Team", "Team") },
  { href: "/app/checkup", icon: ClipboardCheck, label: L("Security checkup", "Security checkup") },
  { href: "/app/panic", icon: AlertTriangle, label: L("I've been scammed", "Dem don scam me") },
];

const BOTTOM = [
  { href: "/app/profile", icon: User, label: L("Profile", "Yourself") },
  { href: "/app/settings", icon: Settings, label: L("Settings", "Settings") },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const initials = user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
  const isReviewer = user.role === "admin" || user.role === "reviewer";

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const item = (n: { href: string; icon: typeof User; label: { en: string; pidgin: string } }) => (
    <SidebarMenuItem key={n.href}>
      <SidebarMenuButton asChild isActive={pathname.startsWith(n.href)} tooltip={tr(language, n.label)}>
        <Link href={n.href}>
          <n.icon />
          <span>{tr(language, n.label)}</span>
          {n.href === "/app/dashboard" && user.unreadAlerts > 0 && (
            <span className="ml-auto rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">{user.unreadAlerts}</span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/app/dashboard" className="flex items-center gap-2 px-1">
            <AaboLogo className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">Ààbò</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {NAV.map(item)}
            {(user.orgRole === "owner" || user.orgRole === "admin") && item({ href: "/app/developer", icon: Code2, label: L("Developer", "Developer") })}
            {isReviewer && item({ href: "/admin/review", icon: Scale, label: L("Review reports", "Review reports") })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {BOTTOM.map(item)}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onSignOut} tooltip={tr(language, L("Sign out", "Comot"))}>
                <LogOut />
                <span>{tr(language, L("Sign out", "Comot"))}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <p className="truncate text-sm font-medium text-muted-foreground">{user.businessName ?? ""}</p>
          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="max-w-[220px] truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile">{tr(language, L("Profile", "Yourself"))}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">{tr(language, L("Settings", "Settings"))}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/check">{tr(language, L("Public checker", "Public checker"))}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSignOut}>{tr(language, L("Sign out", "Comot"))}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
