/**
 * @fileoverview Shapes the Developer settings page receives (client-safe; no secrets ever).
 */

import type { JsonMode } from './ai-presets';

export type DevCode =
  | 'forbidden'
  | 'operator_off'
  | 'secrets_unavailable'
  | 'developer_mode_off'
  | 'invalid'
  | 'rate_limited'
  | 'not_found'
  | 'platform_ai_missing';

export type AiTestCode = 'ok' | 'auth_failed' | 'model_not_found' | 'unreachable' | 'blocked_address' | 'bad_response' | 'timeout' | 'rate_limited';

export interface AiTestResult {
  ok: boolean;
  code: AiTestCode;
  latencyMs: number;
  model: string;
  /** JSON mode that worked (after any automatic downgrade). */
  jsonMode: JsonMode | null;
  /** Whether an image request worked; null when vision is off or the text test failed. */
  vision: boolean | null;
}

export interface EngineInfoView {
  id: string;
  version: string;
  requested: string;
  fallback: boolean;
  error?: string;
}

export interface IntegrationView {
  kind: 'ai' | 'safebrowsing' | 'urlhaus';
  config: Record<string, unknown>;
  /** Last characters of the stored secret, or null when none is stored. */
  hint: string | null;
  enabled: boolean;
  status: string;
  lastError: string | null;
  lastUsedAt: string | null;
  updatedAt: string;
}

export interface AuditView {
  action: string;
  target: string | null;
  actor: string;
  createdAt: string;
}

export interface DeveloperOverview {
  role: 'owner' | 'admin' | 'member';
  orgName: string;
  developerMode: boolean;
  /** Operator allows Developer Mode (DEVELOPER_MODE is not "off"). */
  allowed: boolean;
  /** AABO_SECRET_KEYS is configured, so secrets can be stored. */
  secretsAvailable: boolean;
  platformAi: { available: boolean; provider: string | null; model: string | null };
  engine: EngineInfoView | null;
  integrations: IntegrationView[];
  audit: AuditView[];
}
