import { defineConfig } from "vitest/config";
import path from "node:path";

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
      DATABASE_URL: "file:./test.db",
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
      GOOGLE_SAFE_BROWSING_API_KEY: "",
      URLHAUS_AUTH_KEY: "",
    },
  },
});
