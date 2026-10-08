/**
 * Re-seals every stored secret with the first key in AABO_SECRET_KEYS.
 *   1. Put the new key first, keep the old one:   AABO_SECRET_KEYS="k2:<new>,k1:<old>"
 *   2. npx tsx scripts/rotate-secrets.ts
 *   3. Remove the old key from AABO_SECRET_KEYS once this reports 0 failures.
 * Generate a key with: openssl rand -base64 32
 */
import 'dotenv/config';
import { prisma } from '../src/server/db';
import { connectionAad, integrationAad, keyring, needsReseal, open, seal } from '../src/server/secrets/crypto';

async function main() {
  if (!keyring().length) {
    console.error('AABO_SECRET_KEYS is not set.');
    process.exit(1);
  }
  let resealed = 0;
  let failed = 0;
  for (const row of await prisma.orgIntegration.findMany({ where: { secret: { not: null } } })) {
    if (!row.secret || !needsReseal(row.secret)) continue;
    try {
      const aad = integrationAad(row.orgId, row.kind);
      await prisma.orgIntegration.update({ where: { id: row.id }, data: { secret: seal(open(row.secret, aad), aad) } });
      resealed++;
    } catch {
      failed++;
      console.error(`could not re-seal integration ${row.id} (${row.kind})`);
    }
  }
  for (const row of await prisma.channelConnection.findMany()) {
    if (!needsReseal(row.secret)) continue;
    try {
      const aad = connectionAad(row.orgId, row.id);
      await prisma.channelConnection.update({ where: { id: row.id }, data: { secret: seal(open(row.secret, aad), aad) } });
      resealed++;
    } catch {
      failed++;
      console.error(`could not re-seal connection ${row.id}`);
    }
  }
  console.log(`re-sealed ${resealed}, failed ${failed}`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main();
