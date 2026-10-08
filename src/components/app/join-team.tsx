"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvite } from "@/app/app/team/actions";

/** Joining a business is an explicit choice: nothing happens until the user confirms. */
export function JoinTeam({ code, orgName, valid }: { code: string; orgName: string | null; valid: boolean }) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const join = () =>
    start(async () => {
      const r = await acceptInvite(code);
      setState(r.ok ? { ok: true, text: r.note ?? `You joined ${r.orgName} on Ààbò. 🎉` } : { ok: false, text: r.error });
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{state ? state.text : valid ? `Join ${orgName} on Ààbò?` : "This invite link is invalid or expired."}</CardTitle>
          {!state && valid && (
            <CardDescription>
              The business&apos;s owner and admins will see the scams that reach you, and your checks will use its settings. Only accept invites from
              people you know.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          {!state && valid && (
            <>
              <Button onClick={join} disabled={pending} data-testid="join-confirm">
                Join {orgName}
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/dashboard">Not now</Link>
              </Button>
            </>
          )}
          {state?.ok && (
            <Button asChild>
              <Link href="/app/learn">Start the scam lessons</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
