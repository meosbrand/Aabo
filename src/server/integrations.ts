/**
 * @fileoverview An organisation's Developer Mode settings as used at scan time (AI provider,
 * threat-intel keys), cached for 30 seconds. Gateway-safe: no Next.js imports.
 */

import type { UrlIntel } from '@/core/types';
import { prisma } from './db';
import { logError } from './log';
import { integrationAad, open } from './secrets/crypto';
import { NetworkUrlIntel, urlIntel as platformUrlIntel } from './url-intel';

export type IntegrationKind = 'ai' | 'safebrowsing' | 'urlhaus';
export const INTEGRATION_KINDS: IntegrationKind[] = ['ai', 'safebrowsing', 'urlhaus'];

export interface AiIntegrationConfig {
  /** platform: use Ààbò's AI; byok: the organisation's own endpoint; off: rules only */
  mode: 'platform' | 'byok' | 'off';
  provider?: string;
  baseURL?: string;
  model?: string;
  visionModel?: string;
  jsonMode?: string;
  vision?: boolean | null;
  temperature?: number | 'omit' | null;
  timeoutMs?: number;
}

export interface StoredIntegration {
  kind: IntegrationKind;
  config: Record<string, unknown>;
  secret: string | null;
  enabled: boolean;
}

export interface OrgSettings {
  developerMode: boolean;
  integrations: Map<IntegrationKind, StoredIntegration>;
}

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: OrgSettings | null }>();

/** Operator switch: DEVELOPER_MODE=off disables every organisation's Developer Mode. */
export function developerModeAllowed(): boolean {
  return process.env.DEVELOPER_MODE !== 'off';
}

export async function orgSettings(orgId: string): Promise<OrgSettings | null> {
  const hit = cache.get(orgId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { developerMode: true, integrations: { select: { kind: true, config: true, secret: true, enabled: true } } },
  });
  const value: OrgSettings | null = org
    ? {
        developerMode: org.developerMode && developerModeAllowed(),
        integrations: new Map(
          org.integrations
            .filter((i) => (INTEGRATION_KINDS as string[]).includes(i.kind))
            .map((i) => [i.kind as IntegrationKind, { kind: i.kind as IntegrationKind, config: (i.config ?? {}) as Record<string, unknown>, secret: i.secret, enabled: i.enabled }]),
        ),
      }
    : null;
  if (cache.size > 5000) cache.clear();
  cache.set(orgId, { at: Date.now(), value });
  return value;
}

export function invalidateOrgSettings(orgId?: string | null): void {
  if (orgId) cache.delete(orgId);
  else cache.clear();
}

/** The enabled integration of this kind, only while the organisation has Developer Mode on. */
export async function activeIntegration(orgId: string | null | undefined, kind: IntegrationKind): Promise<StoredIntegration | null> {
  if (!orgId) return null;
  const s = await orgSettings(orgId);
  const i = s?.developerMode ? s.integrations.get(kind) : undefined;
  return i?.enabled ? i : null;
}

/** Decrypt an integration secret; null (and the integration marked as failing) if it can't be opened. */
export function openIntegrationSecret(orgId: string, kind: IntegrationKind, sealed: string): string | null {
  try {
    return open(sealed, integrationAad(orgId, kind));
  } catch (err) {
    logError(`cannot open ${kind} secret for org ${orgId}`, err);
    void markIntegration(orgId, kind, { status: 'error', lastError: 'secret_unreadable' });
    return null;
  }
}

export async function markIntegration(orgId: string, kind: IntegrationKind, data: { status?: string; lastError?: string | null; lastUsedAt?: Date }) {
  await prisma.orgIntegration.updateMany({ where: { orgId, kind }, data }).catch(() => undefined);
}

const intelCache = new Map<string, NetworkUrlIntel>();

/** URL intel with the organisation's own keys where it has them, the platform's otherwise. */
export async function urlIntelFor(orgId: string | null | undefined): Promise<UrlIntel> {
  if (!orgId) return platformUrlIntel;
  const [sb, uh] = await Promise.all([activeIntegration(orgId, 'safebrowsing'), activeIntegration(orgId, 'urlhaus')]);
  if (!sb?.secret && !uh?.secret) return platformUrlIntel;
  const safeBrowsing = sb?.secret ? (openIntegrationSecret(orgId, 'safebrowsing', sb.secret) ?? undefined) : undefined;
  const urlhaus = uh?.secret ? (openIntegrationSecret(orgId, 'urlhaus', uh.secret) ?? undefined) : undefined;
  const key = `${orgId}|${safeBrowsing ?? ''}|${urlhaus ?? ''}`;
  let intel = intelCache.get(key);
  if (!intel) {
    if (intelCache.size > 500) intelCache.clear();
    intel = new NetworkUrlIntel({ safeBrowsing, urlhaus });
    intelCache.set(key, intel);
  }
  return intel;
}
