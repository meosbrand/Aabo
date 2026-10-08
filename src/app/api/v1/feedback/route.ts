/** POST /api/v1/feedback — { scanId, verdict: "scam" | "safe" } */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiGuard, badRequest } from '@/server/api';
import { markScanSafe, reportScan } from '@/server/scans';

const Schema = z.object({ scanId: z.string().min(1).max(40), verdict: z.enum(['scam', 'safe']) });

export async function POST(req: Request) {
  const guard = await apiGuard(req, 'feedback', 30);
  if (guard.error) return guard.error;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Invalid feedback', parsed.error.flatten());
  if (parsed.data.verdict === 'scam') await reportScan(parsed.data.scanId, { userId: guard.key?.userId });
  else await markScanSafe(parsed.data.scanId);
  return NextResponse.json({ ok: true });
}
