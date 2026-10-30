import { defineConfig } from "vitest/config";
import path from "node:path";

/** SQLite by default; `npm run test:pg` runs the same tests in a fresh schema of TEST_DATABASE_URL. */
function testDatabaseUrl(): string {
  const pg = process.env.TEST_DATABASE_URL;
  if (!pg?.startsWith("postgres")) return "file:./test.db";
  const url = new URL(pg);
  url.searchParams.set("schema", `test_${process.pid}_${Date.now()}`);
  return url.toString();
}

const databaseUrl = (process.env.AABO_TEST_DATABASE_URL ??= testDatabaseUrl());

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one SQLite file; run files one at a time.
    fileParallelism: false,
    env: {
      // Tests never hit the network or a real LLM.
      INTEL_NETWORK_LOOKUPS: "0",
      DATABASE_URL: databaseUrl,
      AI_PROVIDER: "",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "",
      AI_VISION_MODEL: "",
      AI_ALLOW_PRIVATE_ENDPOINTS: "",
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      OPENAI_ORG_ID: "",
      OPENAI_PROJECT_ID: "",
      OPENAI_CUSTOM_HEADERS: "",
      AABO_ENGINE: "",
      AABO_ENGINE_MODULE: "",
      AABO_ENGINE_REQUIRED: "",
      AABO_PRO_PROMPT_FOR_BYOK: "",
      DEVELOPER_MODE: "",
      // Fixed test keyring (never use outside tests).
      AABO_SECRET_KEYS: "t1:BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=",
      GOOGLE_SAFE_BROWSING_API_KEY: "",
      URLHAUS_AUTH_KEY: "",
    },
  },
});
