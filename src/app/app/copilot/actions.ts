'use server';

import { securityAwarenessChatbot } from '@/server/ai/copilot';
import type { Verdict } from '@/core/types';
import { prisma } from '@/server/db';
import { runScan } from '@/server/scans';
import { getSessionUser } from '@/server/session';
import { clientIp, rateLimit } from '@/server/rate-limit';
import { toPublicVerdict } from '@/server/verdict-public';

const QUESTION = /\?\s*$|^(how|what|why|when|which|who|is|are|can|could|should|do|does|will|abeg how|abeg wetin|wetin|how i fit|how do|i wan know|explain|tell me)\b/i;
const INDICATOR = /https?:\/\/|www\.|\b[\w-]+\.(com|ng|xyz|top|net|org|info|link|site|online|app|ly)\b|\b0[789][01]\d{8}\b|\+?234\d{10}\b|\b\d{10}\b/i;

export type AssistantReply =
  | { kind: 'answer'; text: string }
  | { kind: 'verdict'; verdict: Verdict; scanId: string; seenCount: number }
  | { kind: 'error'; text: string };

/** One box for everything: paste a message to check it, or ask a security question. */
export async function assistantAction(text: string, language: 'en' | 'pidgin', mode: 'auto' | 'check' | 'ask' = 'auto'): Promise<AssistantReply> {
  const user = await getSessionUser();
  if (!user) return { kind: 'error', text: 'Please sign in again.' };
  const input = text.trim().slice(0, 6000);
  if (!input) return { kind: 'error', text: 'Type a question or paste a message.' };
  const limit = await rateLimit(`assistant:${user.id}:${await clientIp()}`, 120, 3_600_000);
  if (!limit.ok) return { kind: 'error', text: 'You are going fast! Please wait a little and try again.' };

  const isQuestion = mode === 'ask' || (mode === 'auto' && QUESTION.test(input) && !INDICATOR.test(input) && input.length < 400);
  if (!isQuestion) {
    const res = await runScan({ text: input, channel: 'web' }, { userId: user.id, orgId: user.orgId, storeExcerpt: true });
    return { kind: 'verdict', verdict: toPublicVerdict(res.verdict), scanId: res.scanId, seenCount: res.seenCount };
  }

  const history = await prisma.chatMessage.findMany({ where: { userId: user.id, identityId: null }, orderBy: { createdAt: 'desc' }, take: 10 });
  const { advice } = await securityAwarenessChatbot(
    {
      query: input,
      language,
      history: history.reverse().map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    },
    { orgId: user.orgId },
  );
  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: 'user', content: input.slice(0, 2000) },
      { userId: user.id, role: 'assistant', content: advice.slice(0, 4000) },
    ],
  });
  return { kind: 'answer', text: advice };
}
