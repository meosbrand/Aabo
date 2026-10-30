#!/usr/bin/env node
/**
 * Generates prisma/postgres/schema.prisma (production) from prisma/schema.prisma (SQLite, local
 * development and tests). Edit only prisma/schema.prisma, then run `npm run db:pg:schema`.
 *   node scripts/prisma-schema.mjs           write the Postgres schema
 *   node scripts/prisma-schema.mjs --check   fail if it is out of date
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
const target = path.join(root, 'prisma/postgres/schema.prisma');

if (!/provider\s*=\s*"sqlite"/.test(source)) {
  console.error('prisma/schema.prisma should use provider = "sqlite"');
  process.exit(2);
}

const header = '// GENERATED from prisma/schema.prisma by scripts/prisma-schema.mjs — do not edit by hand.\n';
const body = source.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
const output = header + body;

if (process.argv.includes('--check')) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== output) {
    console.error('prisma/postgres/schema.prisma is out of date. Run: npm run db:pg:schema');
    process.exit(1);
  }
  console.log('prisma/postgres/schema.prisma is up to date.');
} else {
  writeFileSync(target, output);
  console.log('wrote prisma/postgres/schema.prisma');
}
