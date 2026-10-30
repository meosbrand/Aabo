#!/usr/bin/env node
/**
 * Adds a Postgres migration for changes made to prisma/schema.prisma:
 *   SHADOW_DATABASE_URL=postgresql://user:pass@localhost:5432/aabo_shadow npm run db:pg:migration -- add_widgets
 * The shadow database must be an empty database Prisma may wipe (never a real one). Review the SQL
 * before committing it; production applies it with `prisma migrate deploy` on the next release.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const name = (process.argv[2] ?? '').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
const shadow = process.env.SHADOW_DATABASE_URL;
if (!shadow?.startsWith('postgres')) {
  console.error('Set SHADOW_DATABASE_URL to an empty Postgres database Prisma may wipe.');
  process.exit(2);
}

const root = path.resolve(import.meta.dirname, '..');
if (spawnSync('node', ['scripts/prisma-schema.mjs'], { cwd: root, stdio: 'inherit' }).status !== 0) process.exit(1);
const sql = execFileSync(
  'npx',
  [
    'prisma', 'migrate', 'diff',
    '--from-migrations', 'prisma/postgres/migrations',
    '--to-schema-datamodel', 'prisma/postgres/schema.prisma',
    '--shadow-database-url', shadow,
    '--script',
  ],
  { cwd: root, encoding: 'utf8' },
);
if (!sql.split('\n').some((l) => l.trim() && !l.trim().startsWith('--'))) {
  console.log('No schema changes: nothing to migrate.');
  process.exit(0);
}
if (!name) {
  console.error('Give the migration a name: npm run db:pg:migration -- <name>');
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const dir = path.join(root, 'prisma/postgres/migrations', `${stamp}_${name}`);
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'migration.sql'), sql);
console.log(`wrote ${path.relative(root, dir)}/migration.sql — review it before committing.`);
