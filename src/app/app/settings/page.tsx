
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
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Zod schema for validating the profile form.
 */
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
});

/**
 * Type definition for the profile form values, inferred from the Zod schema.
 */
type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * Renders the Settings page.
 * This page contains tabs for managing Profile, Integrations, and Notifications.
 * @returns {JSX.Element} The SettingsPage component.
 */
export default function SettingsPage() {
  // Retrieves language context for translations.
  const { language, t } = useLanguage();
  // Gets the translated strings for the current language.
  const T = t.settings[language];

  // Initializes the form using react-hook-form and Zod for validation.
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "Current User",
      email: "user@example.com",
    },
  });

  /**
   * Handles form submission for the profile tab.
   * @param {ProfileFormValues} data - The validated form data.
   */
  function onSubmit(data: ProfileFormValues) {
    toast({
      title: T.profileUpdateToast,
      description: T.profileUpdateToastDesc,
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">{T.title}</h1>
        <p className="text-muted-foreground">{T.description}</p>
      </div>
      {/* Tabbed interface for different settings categories */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">{T.profileTab}</TabsTrigger>
          <TabsTrigger value="integrations">{T.integrationsTab}</TabsTrigger>
          <TabsTrigger value="notifications">{T.notificationsTab}</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{T.profileCardTitle}</CardTitle>
              <CardDescription>{T.profileCardDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{T.nameLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{T.emailLabel}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">{T.saveButton}</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
