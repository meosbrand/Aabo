/**
 * @fileoverview Which AI configuration a scan or Co-pilot answer uses for an organisation.
 *
 * 1. Developer Mode on with an AI integration: "off" → no AI; "byok" → the organisation's own
 *    endpoint (never the platform key — if it is broken, the scan runs without AI); "platform" → 2.
 * 2. The platform configuration (AI_* variables), under the per-organisation daily cap.
 * 3. Nothing configured → no AI.
 */

import { activeIntegration, markIntegration, openIntegrationSecret, type AiIntegrationConfig } from '../integrations';
import { AiConfigError, buildAiConfig, platformAiConfig, type AiConfig } from './config';

export async function resolveAiConfig(orgId?: string | null): Promise<AiConfig | null> {
  const platform = platformAiConfig();
  const shared = platform ? { ...platform, orgId: orgId ?? null } : null;
  if (!orgId) return shared;
  const ai = await activeIntegration(orgId, 'ai');
  if (!ai) return shared;
  const cfg = ai.config as unknown as AiIntegrationConfig;
  if (cfg.mode === 'off') return null;
  if (cfg.mode !== 'byok') return shared;
  const key = ai.secret ? openIntegrationSecret(orgId, 'ai', ai.secret) : '';
  if (key === null) return null;
  try {
    return buildAiConfig({ ...cfg, apiKey: key }, 'byok', orgId);
  } catch (err) {
    void markIntegration(orgId, 'ai', { status: 'error', lastError: err instanceof AiConfigError ? err.code : 'config_invalid' });
    return null;
  }
}
