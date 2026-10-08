import http from 'node:http';
import path from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const AI_PORT = 9101;
const PASSWORD = 'correct-horse-battery';
const db = new PrismaClient({ datasources: { db: { url: `file:${path.resolve('prisma/e2e.db')}` } } });
let fakeAi: http.Server;
const seenKeys: string[] = [];

test.beforeAll(async () => {
  fakeAi = http.createServer((req, res) => {
    seenKeys.push(String(req.headers.authorization ?? ''));
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'x', object: 'chat.completion', created: 1, model: 'fake-model', choices: [{ index: 0, message: { role: 'assistant', content: '{"ok": true}', refusal: null }, finish_reason: 'stop' }] }));
    });
  });
  await new Promise<void>((r) => fakeAi.listen(AI_PORT, '127.0.0.1', () => r()));
});

test.afterAll(async () => {
  await new Promise<void>((r) => fakeAi.close(() => r()));
  await db.$disconnect();
});

async function signUp(request: APIRequestContext, name: string, email: string) {
  const res = await request.post('/api/auth/sign-up/email', { data: { name, email, password: PASSWORD }, headers: { origin: 'http://127.0.0.1:9100' } });
  expect(res.ok()).toBeTruthy();
}

test('an owner turns on Developer Mode and connects their own AI provider', async ({ page }) => {
  await signUp(page.request, 'Ngozi', 'ngozi@e2e.test');
  await page.goto('/app/developer');
  await expect(page.getByRole('heading', { name: 'Developer' })).toBeVisible();
  await expect(page.getByTestId('engine-id')).toContainText('community');

  await page.getByTestId('devmode-switch').click();
  await page.getByTestId('devmode-confirm').click();
  await expect(page.getByTestId('devmode-switch')).toHaveAttribute('data-state', 'checked');

  await page.getByTestId('ai-mode-byok').click();
  await page.getByTestId('ai-provider').click();
  await page.getByRole('option', { name: 'Other OpenAI-compatible API' }).click();
  await page.getByTestId('ai-base-url').fill(`http://127.0.0.1:${AI_PORT}/v1`);
  await page.getByTestId('ai-model').fill('fake-model');
  await page.getByTestId('ai-key').fill('sk-e2e-secret-key-1234');
  await page.getByTestId('ai-save').click();
  await expect(page.getByText('Saved', { exact: true }).first()).toBeVisible();

  await page.getByTestId('ai-test').click();
  await expect(page.getByTestId('ai-test-result')).toContainText('Connected');
  expect(seenKeys.at(-1)).toBe('Bearer sk-e2e-secret-key-1234');

  await page.reload();
  await expect(page.getByTestId('ai-key')).toHaveValue('');
  await expect(page.getByTestId('ai-key-hint')).toContainText('…1234');
  expect(await page.content()).not.toContain('sk-e2e-secret-key');
  await expect(page.getByTestId('audit-log')).toContainText('ai.save');

  const row = await db.orgIntegration.findFirst({ where: { kind: 'ai' } });
  expect(row?.secret).toMatch(/^v1\./);
  expect(JSON.stringify(row)).not.toContain('sk-e2e-secret-key');
});

test('members of the business cannot open Developer settings', async ({ page }) => {
  await signUp(page.request, 'Tunde', 'tunde@e2e.test');
  const owner = await db.user.findUniqueOrThrow({ where: { email: 'ngozi@e2e.test' }, include: { memberships: true } });
  const member = await db.user.findUniqueOrThrow({ where: { email: 'tunde@e2e.test' }, include: { memberships: true } });
  // Make Tunde staff in Ngozi's business (as accepting an invite would).
  await db.membership.deleteMany({ where: { userId: member.id } });
  await db.membership.create({ data: { userId: member.id, orgId: owner.memberships[0].orgId, role: 'member' } });

  const res = await page.goto('/app/developer');
  expect(res?.status()).toBe(404);
  await page.goto('/app/dashboard');
  await expect(page.getByRole('link', { name: 'Developer' })).toHaveCount(0);
});
