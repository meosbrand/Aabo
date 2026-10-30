import { afterAll, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/server/db';
import { Lease, leaseStatus } from '@/server/lease';

afterAll(() => prisma.lease.deleteMany());

describe('leases (one gateway at a time)', () => {
  it('lets only one holder in, until it releases or expires', async () => {
    const a = new Lease('test-lease', 60_000);
    const b = new Lease('test-lease', 60_000);
    const results = await Promise.all([a.tryAcquire(), b.tryAcquire()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const [first, second] = results[0] ? [a, b] : [b, a];
    expect(await first.tryAcquire()).toBe(true); // renewing keeps it
    expect(await second.tryAcquire()).toBe(false);
    await first.release();
    expect(await second.tryAcquire()).toBe(true);
    // An expired lease can be taken over.
    await prisma.lease.update({ where: { name: 'test-lease' }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await first.tryAcquire()).toBe(true);
    expect(await second.tryAcquire()).toBe(false);
  });

  it('reports the gateway in /api/health', async () => {
    const body = async (url: string) => {
      const res = await GET(new Request(url));
      return { status: res.status, json: await res.json() };
    };
    let r = await body('http://x/api/health');
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, database: true, engine: { id: 'community' } });
    expect((await body('http://x/api/health?gateway=1')).status).toBe(503);
    const gw = new Lease('gateway');
    await gw.tryAcquire();
    r = await body('http://x/api/health?gateway=1');
    expect(r.status).toBe(200);
    expect(r.json.gateway.live).toBe(true);
    expect((await leaseStatus('gateway')).renewedSecondsAgo).toBeLessThan(5);
    await gw.release();
  });
});
