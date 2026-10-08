"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";
import { L, tr } from "@/lib/i18n";
import { updateProfile } from "@/app/app/actions";

const T = {
  title: L("Profile", "Yourself"),
  name: L("Your name", "Your name"),
  business: L("Business name", "Business name"),
  email: L("Email", "Email"),
  phone: L("Linked WhatsApp", "WhatsApp wey don link"),
  since: L("Member since", "You join since"),
  save: L("Save changes", "Save am"),
  saved: L("Profile updated", "We don update your profile"),
};

export function ProfileForm(props: { name: string; email: string; businessName: string; phone: string | null; createdAt: string }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState(props.name);
  const [business, setBusiness] = useState(props.businessName);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr(language, T.title)}</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{props.name}</CardTitle>
          <CardDescription>
            {tr(language, T.since)} {new Date(props.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await updateProfile({ name, businessName: business });
                toast({ title: res.ok ? tr(language, T.saved) : res.error ?? "Error", variant: res.ok ? "default" : "destructive" });
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="p-name">{tr(language, T.name)}</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-business">{tr(language, T.business)}</Label>
              <Input id="p-business" value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">{tr(language, T.email)}</Label>
              <Input id="p-email" value={props.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>{tr(language, T.phone)}</Label>
              <p className="text-sm text-muted-foreground">{props.phone ?? "—"}</p>
            </div>
            <Button type="submit" disabled={pending}>
              {tr(language, T.save)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
