# Open core: how detection engines plug in

Ààbò is split into an open-source app and replaceable detection engines.

| Part | Where | License |
|---|---|---|
| App shell: web PWA, API, gateway (WhatsApp/Telegram), Guardian host, awareness, teams, AI integration | this repository | MIT |
| Engine contract and shell guarantees | `src/core/engine.ts`, `src/core/normalize.ts` | MIT |
| Community engine | `src/engines/community` | MIT |
| Ààbò production engine | separate package (`@meosbrand/aabo-engine`) | proprietary |

## Choosing an engine

| Variable | Meaning |
|---|---|
| `AABO_ENGINE=community` | default — the bundled community engine |
| `AABO_ENGINE=module` + `AABO_ENGINE_MODULE=<package or path>` | load an engine module at runtime, e.g. `@meosbrand/aabo-engine` or `../aabo-engine/dist/index.js` |
| `AABO_ENGINE_REQUIRED=1` | fail at start-up instead of falling back to the community engine (use in production) |

The loader (`src/server/engine-loader.ts`) checks the module's `apiVersion` and shape. If the module is missing,
incompatible or throws while analysing, the app logs it and uses the community engine — unless
`AABO_ENGINE_REQUIRED=1`. `npx tsx scripts/smoke-engine.ts` shows which engine runs and checks a few verdicts.

With Docker, pass `--build-arg AABO_ENGINE_PKG=<package>` (and a `--secret id=npmrc` for private registries); the
package is installed under `/opt/aabo-engine` and never appears in `package.json`.

## Writing an engine

An engine module exports:

```ts
export const apiVersion = 1; // ENGINE_API_VERSION
export function createEngine(): ScanEngine;
```

`ScanEngine` (see `src/core/engine.ts`) has `id`, `version`, `apiVersion`, `analyze(input, deps)` and optional parts:

- `llmPrompt` — the prompt for the platform's own AI model
- `reputation` — how community reports become confidence, and when an indicator counts as confirmed
- `feeds` — which indicators a threat-feed URL produces
- `guardian` — what Guardian scans, how much chat context it keeps, and how the owner's warning reads
- `curatedIndicators()` — indicators a fresh database is seeded with

`deps` gives the engine the reputation store, network URL intel and (when configured) an LLM. Engines must not do
their own I/O beyond these. Run the shared behaviour checks against your engine:

```ts
import { engineContractSuite } from '<path to>/src/engines/contract-suite';
engineContractSuite('my-engine', () => createEngine());
```

## What the app guarantees, whatever engine runs

- **Hard floors hold.** `normalizeVerdict` raises a verdict to the highest floor among its positive signals, so an
  AI model (or a buggy engine) can never talk a hard signal down.
- **The app computes the content hash and the advice text**, and validates the verdict's shape and sizes.
- **Engine internals stay on the server.** `toPublicVerdict` replaces signal weights with their sign, drops floors
  and fingerprints, and hashes signal ids outside the public vocabulary (`c.`, `safe.`, `ocr.`, `image.`,
  `engine.`, `llm.`) before anything reaches a browser or API client.
- **Guardian privacy.** Guardian scans never store message text, and warnings go only to the owner's own chat. An
  engine's Guardian policy can suppress alerts but cannot alert below the owner's chosen threshold.
- **AI prompts.** The engine's own prompt is sent only to the platform's AI model. An organisation's own endpoint
  (bring-your-own-key) receives the community prompt and coarse signals.

## Versioning

`ENGINE_API_VERSION` changes only when the contract changes incompatibly. Engines built for another version are
refused by the loader.
