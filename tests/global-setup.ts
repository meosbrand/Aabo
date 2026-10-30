import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Fresh database for integration tests: prisma/test.db (SQLite, default), or a new schema in
 * TEST_DATABASE_URL (Postgres, via `npm run test:pg`) built from the production migrations.
 */
export default function setup() {
  const url = process.env.AABO_TEST_DATABASE_URL ?? 'file:./test.db';
  const env = { ...process.env, DATABASE_URL: url };
  if (url.startsWith('postgres')) {
    execSync('npx prisma migrate deploy --schema prisma/postgres/schema.prisma', { env, stdio: 'ignore' });
    return;
  }
  rmSync(path.resolve(__dirname, '../prisma/test.db'), { force: true });
  execSync('npx prisma db push --skip-generate', { env, stdio: 'ignore' });
}
