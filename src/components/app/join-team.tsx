"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptInvite } from "@/app/app/team/actions";

export function JoinTeam({ code }: { code: string }) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    acceptInvite(code).then((r) => setState(r.ok ? { ok: true, text: `You joined ${r.orgName} on Ààbò. 🎉` } : { ok: false, text: r.error }));
  }, [code]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{state ? state.text : "Joining…"}</CardTitle>
        </CardHeader>
        <CardContent>
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
