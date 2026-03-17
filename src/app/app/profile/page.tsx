
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { AtSign, Calendar, Edit, Shield } from "lucide-react";
import Link from "next/link";

/**
 * Renders the user's profile page.
 * This page displays the user's personal information, profile picture, and key account details.
 * @returns {JSX.Element} The ProfilePage component.
 */
export default function ProfilePage() {
    // Retrieves language context for translations.
    const { language, t } = useLanguage();
    // Gets the translated strings for the current language.
    const T = t.profile[language];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{T.title}</h1>
                    <p className="text-muted-foreground">{T.description}</p>
                </div>
                <Button asChild>
                    <Link href="/app/settings">
                        <Edit className="mr-2 h-4 w-4" />
                        {T.editButton}
                    </Link>
                </Button>
            </div>

            <Card className="shadow-lg">
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="w-24 h-24 border-4 border-primary">
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person smiling" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold">Current User</h2>
                        <p className="text-muted-foreground">user@example.com</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{T.detailsTitle}</CardTitle>
                    <CardDescription>{T.detailsDescription}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                        <AtSign className="w-6 h-6 text-primary"/>
                        <div>
                            <p className="text-sm text-muted-foreground">{T.emailLabel}</p>
                            <p className="font-semibold">user@example.com</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                        <Calendar className="w-6 h-6 text-primary"/>
                        <div>
                            <p className="text-sm text-muted-foreground">{T.memberSinceLabel}</p>
                            <p className="font-semibold">October 1, 2023</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg border">
                        <Shield className="w-6 h-6 text-primary"/>
                        <div>
                            <p className="text-sm text-muted-foreground">{T.protectionPlanLabel}</p>
                            <p className="font-semibold">Digital Shield - Pro</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
