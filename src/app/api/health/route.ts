/**
 * GET /api/health — for the hosting platform's health check and uptime monitors.
 *   200 when the database answers and the detection engine is loaded (503 otherwise).
 *   ?gateway=1 also requires the messaging gateway to be running (its lease is live).
 * Returns no secrets and no user data.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { engineInfo, loadEngine } from '@/server/engine-loader';
import { leaseStatus } from '@/server/lease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const wantGateway = new URL(req.url).searchParams.get('gateway') === '1';
  let database = false;
  let engine: { id: string; version: string; fallback: boolean } | null = null;
  let gateway: Awaited<ReturnType<typeof leaseStatus>> | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
    gateway = await leaseStatus('gateway');
  } catch {
    // reported below
  }
  try {
    await loadEngine();
    const info = engineInfo();
    if (info) engine = { id: info.id, version: info.version, fallback: info.fallback };
  } catch {
    // AABO_ENGINE_REQUIRED=1 and the engine failed to load
  }
  const ok = database && Boolean(engine) && (!wantGateway || Boolean(gateway?.live));
  return NextResponse.json({ ok, database, engine, gateway }, { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
