
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, MessageSquareHeart, PowerOff, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function PanicPage() {
  const { language, t } = useLanguage();
  const T = t.panic[language];

  return (
    <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
            <h1 className="text-3xl font-bold">{T.title}</h1>
            <p className="text-muted-foreground">{T.description}</p>
        </div>
      
      <Card className="w-full max-w-2xl mt-8 shadow-lg">
        <CardHeader className="text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive" />
          <CardTitle className="text-2xl mt-4">{T.cardTitle}</CardTitle>
          <CardDescription>
            {T.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 p-8">
          <Button variant="destructive" size="lg" className="h-24 w-full text-2xl font-bold rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <ShieldAlert className="mr-4 w-8 h-8" />
            {T.mainButton}
          </Button>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Button variant="secondary" className="h-20 flex-col gap-1">
              <Phone className="w-6 h-6" />
              <span>{T.contactSupport}</span>
            </Button>
            <Button variant="secondary" className="h-20 flex-col gap-1">
              <MessageSquareHeart className="w-6 h-6" />
              <span>{T.sendHelp}</span>
            </Button>
            <Button variant="secondary" className="h-20 flex-col gap-1">
              <PowerOff className="w-6 h-6" />
              <span>{T.shutdown}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
