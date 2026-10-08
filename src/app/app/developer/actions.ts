'use server';

import { revalidatePath } from 'next/cache';
import type { AiTestResult, DevCode } from '@/lib/developer-types';
import {
  removeIntegration,
  saveAiIntegration,
  saveIntelKey,
  setDeveloperMode,
  testAiIntegration,
} from '@/server/devmode';
import { orgActor } from '@/server/org-auth';
import { getSessionUser } from '@/server/session';

export type DevActionResult = { ok: true; result?: AiTestResult } | { ok: false; code: DevCode; message?: string };

async function actor() {
  const user = await getSessionUser();
  return user ? orgActor(user.id, user.orgId) : null;
}

function done<T extends { ok: boolean }>(res: T): T {
  if (res.ok) revalidatePath('/app/developer');
  return res;
}

export async function toggleDeveloperModeAction(on: boolean): Promise<DevActionResult> {
  return done(await setDeveloperMode(await actor(), on));
}

export async function saveAiAction(input: unknown): Promise<DevActionResult> {
  return done(await saveAiIntegration(await actor(), input));
}

export async function testAiAction(draft?: unknown): Promise<DevActionResult> {
  const res = await testAiIntegration(await actor(), draft);
  if (res.ok) revalidatePath('/app/developer');
  return res.ok ? { ok: true, result: res.result } : res;
}

export async function saveIntelKeyAction(kind: 'safebrowsing' | 'urlhaus', key: string | null): Promise<DevActionResult> {
  return done(await saveIntelKey(await actor(), kind, key));
}

export async function removeAiAction(): Promise<DevActionResult> {
  return done(await removeIntegration(await actor(), 'ai'));
}
