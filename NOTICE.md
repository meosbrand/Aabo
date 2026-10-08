# Notice

Copyright (c) 2025–2026 Michael Ajekigbe.

**This repository** — the Ààbò app (web PWA, API, WhatsApp/Telegram gateway, Guardian host, awareness and team
features, AI integration) and the community detection engine in `src/engines/community` — is licensed under the MIT
license in [LICENSE](LICENSE).

**Ààbò's production detection engine** is a separate, proprietary product. It is not part of this repository and is
not covered by its license. This repository only defines the public interface such an engine implements
(`src/core/engine.ts`) and loads one at runtime when configured (see [docs/open-core.md](docs/open-core.md)).
Running this repository without it uses the community engine.

Third-party packages are used under their own licenses (see `package.json` and `node_modules/*/LICENSE`).
