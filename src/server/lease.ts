/**
 * @fileoverview Exclusive, expiring leases between processes. Used so that only one messaging
 * gateway runs WhatsApp sessions at a time (two would knock each other offline), and as the
 * gateway's heartbeat for /api/health. Gateway-safe.
 */

import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { Prisma } from '@prisma/client';
import { prisma } from './db';

export class Lease {
  readonly holder = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

  constructor(
    readonly name: string,
    private readonly ttlMs = 60_000,
  ) {}

  /** Take (or keep) the lease if it is free, expired or already ours. */
  async tryAcquire(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    try {
      await prisma.lease.create({ data: { name: this.name, holder: this.holder, expiresAt } });
      return true;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
    const taken = await prisma.lease.updateMany({
      where: { name: this.name, OR: [{ holder: this.holder }, { expiresAt: { lt: now } }] },
      data: { holder: this.holder, expiresAt },
    });
    return taken.count === 1;
  }

  /** Wait until the lease is ours (another instance may be shutting down during a deploy). */
  async acquire(opts: { pollMs?: number; onWait?: () => void } = {}): Promise<void> {
    for (let waited = false; ; waited = true) {
      if (await this.tryAcquire()) return;
      if (!waited) opts.onWait?.();
      await new Promise((r) => setTimeout(r, opts.pollMs ?? 5000));
    }
  }

  /** Renew every third of the TTL; `onLost` runs once if another holder took over. */
  keepAlive(onLost: () => void): () => void {
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        if (!stopped && !(await this.tryAcquire())) {
          stopped = true;
          clearInterval(timer);
          onLost();
        }
      } catch {
        // Database hiccup: try again next round; the lease outlives a few missed renewals.
      }
    }, Math.max(1000, Math.floor(this.ttlMs / 3)));
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }

  /** Give the lease up so a new instance can take over at once. */
  async release(): Promise<void> {
    await prisma.lease.deleteMany({ where: { name: this.name, holder: this.holder } }).catch(() => undefined);
  }
}

/** When the named lease was last renewed and whether it is still live. */
export async function leaseStatus(name: string): Promise<{ live: boolean; renewedSecondsAgo: number | null }> {
  const row = await prisma.lease.findUnique({ where: { name } });
  if (!row) return { live: false, renewedSecondsAgo: null };
  return { live: row.expiresAt > new Date(), renewedSecondsAgo: Math.round((Date.now() - row.updatedAt.getTime()) / 1000) };
}
