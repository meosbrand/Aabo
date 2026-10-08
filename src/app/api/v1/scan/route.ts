/**
 * POST /api/v1/scan — analyse text, a link, a phone/account number or a screenshot.
 * Used by partners (MSPs, telcos), the future Android notification app and browser extensions.
 * Body: { text?, url?, phone?, account?, context?, imageBase64?, imageMime?, fileName?, language? }
 */

import { NextResponse } from 'next/server';
import { verdictToChat } from '@/core/format/chat';
import { ScanRequestSchema } from '@/lib/scan-request';
import { apiGuard, badRequest } from '@/server/api';
import { runScan } from '@/server/scans';
import { toPublicVerdict } from '@/server/verdict-public';

export async function POST(req: Request) {
  const guard = await apiGuard(req, 'scan', 30);
  if (guard.error) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = ScanRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid scan request', parsed.error.flatten());
  const { language = 'en', ...input } = parsed.data;
  const { scanId, verdict, seenCount } = await runScan(
    { ...input, channel: 'api' },
    { userId: guard.key?.userId, orgId: guard.key?.orgId, storeExcerpt: true },
  );
  return NextResponse.json({ scanId, seenCount, verdict: toPublicVerdict(verdict), message: verdictToChat(verdict, language, { footer: false }) });
}
