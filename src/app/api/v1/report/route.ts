/** POST /api/v1/report — { scanId } or { type, value, category?, note? } */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizePhone } from '@/core/extract';
import { apiGuard, badRequest } from '@/server/api';
import { reportScan, submitReport } from '@/server/scans';

const Schema = z.union([
  z.object({ scanId: z.string().min(1).max(40), note: z.string().max(500).optional() }),
  z.object({
    type: z.enum(['phone', 'account', 'domain', 'url', 'wallet', 'email']),
    value: z.string().min(3).max(300),
    category: z.string().max(40).optional(),
    note: z.string().max(500).optional(),
  }),
]);

export async function POST(req: Request) {
  const guard = await apiGuard(req, 'report', 20);
  if (guard.error) return guard.error;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest('Invalid report', parsed.error.flatten());
  const reporter = { userId: guard.key?.userId ?? null };
  if ('scanId' in parsed.data) {
    const scan = await reportScan(parsed.data.scanId, reporter, parsed.data.note);
    return scan ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { type, note, category } = parsed.data;
  const value = type === 'phone' ? normalizePhone(parsed.data.value) ?? parsed.data.value : parsed.data.value.trim().toLowerCase();
  await submitReport({ type, value, note, category: (category as never) ?? null, reporterUserId: reporter.userId });
  return NextResponse.json({ ok: true });
}
