import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against a production build:  npm run test:e2e
 * Uses its own SQLite file (prisma/e2e.db) and a fixed test keyring.
 */
const PORT = 9100;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: "node e2e/serve.mjs",
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      DATABASE_URL: 'file:./e2e.db',
      BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0001',
      BETTER_AUTH_URL: `http://127.0.0.1:${PORT}`,
      NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
      AABO_SECRET_KEYS: 't1:BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=',
      AI_ALLOW_PRIVATE_ENDPOINTS: '1',
      AI_PROVIDER: '',
      AI_API_KEY: '',
      INTEL_NETWORK_LOOKUPS: '0',
      AABO_ENGINE: 'community',
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
  },
});
