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
import { Mail, MessageCircle, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "Current User",
      email: "user@example.com",
    },
  });

  function onSubmit(data: ProfileFormValues) {
    toast({
      title: "Profile Updated",
      description: "Your new details have been saved.",
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect Ààbò with your other accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Card className="flex items-center p-4">
                    <MessageCircle className="w-8 h-8 mr-4 text-green-500" />
                    <div className="flex-grow">
                        <h3 className="font-semibold">WhatsApp</h3>
                        <p className="text-sm text-muted-foreground">Receive alerts via messages.</p>
                    </div>
                    <Button variant="secondary">Connect</Button>
                </Card>
                 <Card className="flex items-center p-4">
                    <Mail className="w-8 h-8 mr-4 text-blue-500" />
                    <div className="flex-grow">
                        <h3 className="font-semibold">Email</h3>
                        <p className="text-sm text-muted-foreground">Receive alerts in your inbox.</p>
                    </div>
                    <Button>Disconnect</Button>
                </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you want to be notified about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="security-alerts" className="font-semibold">Security Alerts</Label>
                        <p className="text-sm text-muted-foreground">Receive alerts for suspicious activity.</p>
                    </div>
                    <Switch id="security-alerts" defaultChecked/>
                </div>
                 <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="backup-reports" className="font-semibold">Backup Reports</Label>
                        <p className="text-sm text-muted-foreground">Get notified when backups complete or fail.</p>
                    </div>
                    <Switch id="backup-reports" defaultChecked/>
                </div>
                 <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                        <Label htmlFor="weekly-summary" className="font-semibold">Weekly Summary</Label>
                        <p className="text-sm text-muted-foreground">Receive a summary of your protection status.</p>
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
