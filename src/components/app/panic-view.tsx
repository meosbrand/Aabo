"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, MessageCircle, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { PLAYBOOKS } from "@/core/awareness/playbooks";
import { L, tr } from "@/lib/i18n";
import { addEmergencyContact, removeEmergencyContact } from "@/app/app/actions";

const T = {
  title: L("I've been scammed / hacked", "Dem don scam / hack me"),
  sub: L("Stay calm. Pick what happened and follow the steps — fast action saves money.", "Calm down. Pick wetin happen and follow the steps — quick action dey save money."),
  warn: L("Warn my contacts on WhatsApp", "Warn my people for WhatsApp"),
  contacts: L("Emergency contacts", "Emergency contacts"),
  contactsSub: L("People who can help you quickly (family, accountant, manager). Up to 5.", "People wey fit help you quick (family, accountant, manager). Up to 5."),
  name: L("Name", "Name"),
  phone: L("Phone", "Phone"),
  add: L("Add", "Add"),
  askHelp: L("Ask for help", "Ask for help"),
  call: L("Call", "Call"),
  helpMsg: L("I need urgent help: I think I've been scammed/hacked. Please call me as soon as you see this.", "I need urgent help: I think say dem don scam/hack me. Abeg call me as you see this."),
};

export function PanicView({ contacts, userName }: { contacts: { id: string; name: string; phone: string }[]; userName: string }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-destructive">
          <AlertTriangle /> {tr(language, T.title)}
        </h1>
        <p className="text-muted-foreground">{tr(language, T.sub)}</p>
      </div>

      <div className="grid gap-3">
        {PLAYBOOKS.map((p) => (
          <Card key={p.id} className={open === p.id ? "border-destructive" : ""}>
            <button type="button" className="w-full text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">{tr(language, p.title)}</CardTitle>
                {open === p.id && <CardDescription className="font-medium text-destructive">{tr(language, p.urgent)}</CardDescription>}
              </CardHeader>
            </button>
            {open === p.id && (
              <CardContent className="space-y-4">
                <ol className="list-decimal space-y-2 pl-5">
                  {p.steps.map((s, i) => (
                    <li key={i}>{tr(language, s)}</li>
                  ))}
                </ol>
                {p.warnContacts && (
                  <Button asChild className="bg-[#25D366] text-white hover:bg-[#1da851]">
                    <a href={`https://wa.me/?text=${encodeURIComponent(tr(language, p.warnContacts))}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-1 h-4 w-4" /> {tr(language, T.warn)}
                    </a>
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tr(language, T.contacts)}</CardTitle>
          <CardDescription>{tr(language, T.contactsSub)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.phone}</span>
                <span className="ml-auto flex gap-1">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${c.phone}`}>
                      <Phone className="mr-1 h-4 w-4" />
                      {tr(language, T.call)}
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`${tr(language, T.helpMsg)} — ${userName}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tr(language, T.askHelp)}
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => start(async () => void (await removeEmergencyContact(c.id)))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await addEmergencyContact({ name, phone });
                if (res.ok) {
                  setName("");
                  setPhone("");
                  setError(null);
                } else setError(res.error ?? "Error");
              });
            }}
          >
            <Input placeholder={tr(language, T.name)} value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder={tr(language, T.phone)} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button type="submit" disabled={pending}>
              {tr(language, T.add)}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
