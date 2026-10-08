import { randomBytes } from 'node:crypto';
import { sha256 } from '@/core/hash';
import { prisma } from './db';

/** Create an API key for partners / the future Android app. The plain key is shown once. */
export async function createApiKey(name: string, owner: { userId?: string; orgId?: string }) {
  const plain = `aabo_${randomBytes(24).toString('base64url')}`;
  await prisma.apiKey.create({ data: { name, hash: sha256(plain), prefix: plain.slice(0, 10), userId: owner.userId, orgId: owner.orgId } });
  return plain;
}

/** Resolve a bearer key to its row (or null). */
export async function verifyApiKey(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : req.headers.get('x-api-key')?.trim();
  if (!key) return null;
  const row = await prisma.apiKey.findUnique({ where: { hash: sha256(key) } });
  if (!row || row.revokedAt) return null;
  prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  return row;
}
