import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

/** The detection engine is loaded at runtime (src/server/engine-loader.ts), never imported. */
const engineImportBan = {
  paths: [{ name: "@meosbrand/aabo-engine", message: "Load engines through src/server/engine-loader.ts (AABO_ENGINE=module)." }],
  patterns: [{ group: ["@meosbrand/aabo-engine/*"], message: "Load engines through src/server/engine-loader.ts (AABO_ENGINE=module)." }],
};

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "research/**",
      ".data/**",
      "public/sw.js",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-restricted-imports": ["error", engineImportBan],
    },
  },
  {
    // Client-side code: only browser-safe, presentation-level core modules.
    files: ["src/components/**", "src/context/**", "src/hooks/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...engineImportBan,
          patterns: [
            ...engineImportBan.patterns,
            {
              group: ["@/core/*", "!@/core/advice", "!@/core/defang", "!@/core/format", "!@/core/format/chat", "!@/core/types", "!@/core/levels", "!@/core/awareness", "!@/core/awareness/*"],
              message: "Client code may import only advice, defang, format/chat, types, levels and awareness/* from src/core.",
            },
            { group: ["@/server/*", "@/gateway/*", "@/engines/*"], message: "Server-only module in client code." },
          ],
        },
      ],
    },
  },
  {
    // Web routes never start the messaging gateway or its transports.
    files: ["src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...engineImportBan,
          patterns: [
            ...engineImportBan.patterns,
            {
              group: ["@/gateway/index", "@/gateway/session-manager", "@/gateway/channels/whatsapp/*", "@/gateway/channels/telegram/*"],
              message: "The gateway runs as its own process (npm run gateway).",
            },
          ],
        },
      ],
    },
  },
  {
    // The contract and engines stay pure: no framework, database or app imports.
    files: ["src/core/**", "src/engines/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...engineImportBan,
          patterns: [
            ...engineImportBan.patterns,
            { group: ["@/server/*", "@/app/*", "@/gateway/*", "@/components/*", "@prisma/client", "next", "next/*", "react"], message: "src/core and src/engines must stay framework-free." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
