
"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, MessageCircle, PenSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";


/**
 * Renders the Settings page.
 * This page contains tabs for managing Integrations and Notifications.
 * The profile management has been moved to its own dedicated page.
 * @returns {JSX.Element} The SettingsPage component.
 */
export default function SettingsPage() {
  // Retrieves language context for translations.
  const { language, t } = useLanguage();
  // Gets the translated strings for the current language.
  const T = t.settings[language];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">{T.title}</h1>
        <p className="text-muted-foreground">{T.description}</p>
      </div>
      {/* Tabbed interface for different settings categories */}
      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">{T.integrationsTab}</TabsTrigger>
          <TabsTrigger value="notifications">{T.notificationsTab}</TabsTrigger>
          <TabsTrigger value="account">{T.accountTab}</TabsTrigger>
        </TabsList>
        
        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{T.integrationsCardTitle}</CardTitle>
              <CardDescription>{T.integrationsCardDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Card className="flex items-center p-4">
                    <MessageCircle className="w-8 h-8 mr-4 text-green-500" />
                    <div className="flex-grow">
                        <h3 className="font-semibold">{T.whatsapp}</h3>
                        <p className="text-sm text-muted-foreground">{T.whatsappDesc}</p>
                    </div>
                    <Button variant="secondary">{T.connectButton}</Button>
                </Card>
                 <Card className="flex items-center p-4">
                    <Mail className="w-8 h-8 mr-4 text-blue-500" />
                    <div className="flex-grow">
                        <h3 className="font-semibold">{T.email}</h3>
                        <p className="text-sm text-muted-foreground">{T.emailDesc}</p>
                    </div>
                    <Button>{T.disconnectButton}</Button>
                </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{T.notificationsCardTitle}</CardTitle>
              <CardDescription>{T.notificationsCardDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="security-alerts" className="font-semibold">{T.securityAlerts}</Label>
                        <p className="text-sm text-muted-foreground">{T.securityAlertsDesc}</p>
                    </div>
                    <Switch id="security-alerts" defaultChecked/>
                </div>
                 <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="backup-reports" className="font-semibold">{T.backupReports}</Label>
                        <p className="text-sm text-muted-foreground">{T.backupReportsDesc}</p>
                    </div>
                    <Switch id="backup-reports" defaultChecked/>
                </div>
                 <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="weekly-summary" className="font-semibold">{T.weeklySummary}</Label>
                        <p className="text-sm text-muted-foreground">{T.weeklySummaryDesc}</p>
                    </div>
                    <Switch id="weekly-summary" />
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{T.accountCardTitle}</CardTitle>
              <CardDescription>{T.accountCardDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">
                <PenSquare className="mr-2 h-4 w-4" />
                {T.changePasswordButton}
              </Button>
               <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">{T.deleteAccountTitle}</CardTitle>
                  <CardDescription>{T.deleteAccountDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive">{T.deleteAccountButton}</Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
