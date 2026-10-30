import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('database schema', () => {
  it('keeps the production (Postgres) schema generated from prisma/schema.prisma', () => {
    expect(() => execFileSync('node', ['scripts/prisma-schema.mjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('has Postgres migrations to deploy', () => {
    const dirs = readdirSync('prisma/postgres/migrations').filter((d) => /^\d{14}_/.test(d));
    expect(dirs.length).toBeGreaterThan(0);
  });
});
