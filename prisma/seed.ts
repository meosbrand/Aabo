/**
 * Seeds the curated indicators the loaded detection engine ships with (if any), so known
 * scam blasts are caught from day one.
 * `npm run db:seed -- --demo` also adds a demo reported number for local testing.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { loadEngine } from '../src/server/engine-loader';

const prisma = new PrismaClient();

async function main() {
  const engine = await loadEngine();
  const seeds = (await engine.curatedIndicators?.()) ?? [];
  let added = 0;
  for (const s of seeds) {
    await prisma.indicator.upsert({
      where: { type_value: { type: s.type, value: s.value } },
      create: { type: s.type, value: s.value, category: s.category ?? null, source: s.source, confidence: s.confidence, label: s.label ?? null },
      update: {},
    });
    added++;
  }

  if (process.argv.includes('--demo')) {
    await prisma.indicator.upsert({
      where: { type_value: { type: 'phone', value: '+2349099990000' } },
      create: { type: 'phone', value: '+2349099990000', category: 'fake_alert', source: 'community', confidence: 0.96, reports: 12, label: 'Demo: fake transfer alert sender' },
      update: {},
    });
    await prisma.indicator.upsert({
      where: { type_value: { type: 'domain', value: 'demo-scam-aabo.xyz' } },
      create: { type: 'domain', value: 'demo-scam-aabo.xyz', category: 'phishing', source: 'curated', confidence: 0.97, reports: 3, label: 'Demo phishing domain' },
      update: {},
    });
    console.log('Demo indicators added (+2349099990000, demo-scam-aabo.xyz).');
  }
  console.log(`Seeded ${added} curated indicators from the ${engine.id} engine.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
