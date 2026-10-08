// Starts the production build on a fresh, throwaway E2E database (prisma/e2e.db).
import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`prisma/e2e.db${suffix}`, { force: true });
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
const server = spawn('npx', ['next', 'start', '-p', process.env.PORT ?? '9100'], { stdio: 'inherit', env: process.env });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.kill(sig));
server.on('exit', (code) => process.exit(code ?? 0));
