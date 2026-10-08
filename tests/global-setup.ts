import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

/** Fresh SQLite database for integration tests (prisma/test.db, gitignored). */
export default function setup() {
  const db = path.resolve(__dirname, '../prisma/test.db');
  rmSync(db, { force: true });
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });
}
