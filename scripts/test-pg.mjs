#!/usr/bin/env node
/**
 * Runs the test suite against Postgres (the production database):
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/aabo_test npm run test:pg
 * Each run uses its own fresh schema inside that database. The SQLite Prisma client is restored
 * afterwards so `npm test` keeps working.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.TEST_DATABASE_URL?.startsWith('postgres')) {
  console.error('Set TEST_DATABASE_URL to a Postgres database you can use for tests.');
  process.exit(2);
}

const run = (cmd, args, env = process.env) => spawnSync(cmd, args, { stdio: 'inherit', env }).status ?? 1;

let status = run('node', ['scripts/prisma-schema.mjs', '--check']);
if (status === 0) status = run('npx', ['prisma', 'generate', '--schema', 'prisma/postgres/schema.prisma']);
if (status === 0) status = run('npx', ['vitest', 'run', ...process.argv.slice(2)]);
const restored = run('npx', ['prisma', 'generate']);
process.exit(status || restored);
