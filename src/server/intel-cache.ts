import { prisma } from './db';

/** Small JSON cache in the database for external lookups. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = await prisma.intelCache.findUnique({ where: { key } }).catch(() => null);
  if (hit && hit.expiresAt > new Date()) return hit.value as T;
  const value = await load();
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.intelCache
    .upsert({ where: { key }, create: { key, value: value as object, expiresAt }, update: { value: value as object, expiresAt } })
    .catch(() => undefined);
  return value;
}
