/**
 * @fileoverview Loads an organisation's WhatsApp connection with its decrypted credentials
 * (cached for 30 seconds). Gateway-safe.
 */

import { prisma } from '../../db';
import { logError } from '../../log';
import { connectionAad, open } from '../../secrets/crypto';
import type { CloudConfig, CloudConnection, CloudCredentials, CloudProvider } from './types';

export interface LoadedConnection extends CloudConnection {
  label: string;
  webhookKey: string;
  enabled: boolean;
  status: string;
  inboundSecretHash: string | null;
  dailyLimitPerUser: number;
  orgDailyCap: number;
  copilotEnabled: boolean;
  tipsEnabled: boolean;
  /** The organisation still has Developer Mode on. */
  orgDeveloperMode: boolean;
}

const TTL_MS = 30_000;
const byKey = new Map<string, { at: number; value: LoadedConnection | null }>();
const byId = new Map<string, { at: number; value: LoadedConnection | null }>();

async function load(where: { id: string } | { webhookKey: string }): Promise<LoadedConnection | null> {
  const row = await prisma.channelConnection.findUnique({ where, include: { org: { select: { developerMode: true } } } });
  if (!row) return null;
  let credentials: CloudCredentials;
  try {
    credentials = JSON.parse(open(row.secret, connectionAad(row.orgId, row.id))) as CloudCredentials;
  } catch (err) {
    logError(`cannot open credentials for connection ${row.id}`, err);
    await prisma.channelConnection.update({ where: { id: row.id }, data: { lastError: 'secret_unreadable' } }).catch(() => undefined);
    return null;
  }
  return {
    id: row.id,
    orgId: row.orgId,
    provider: row.provider as CloudProvider,
    externalNumberId: row.externalNumberId,
    config: (row.config ?? {}) as CloudConfig,
    credentials,
    readReceipts: row.readReceipts,
    label: row.label,
    webhookKey: row.webhookKey,
    enabled: row.enabled,
    status: row.status,
    inboundSecretHash: row.inboundSecretHash,
    dailyLimitPerUser: row.dailyLimitPerUser,
    orgDailyCap: row.orgDailyCap,
    copilotEnabled: row.copilotEnabled,
    tipsEnabled: row.tipsEnabled,
    orgDeveloperMode: row.org.developerMode && process.env.DEVELOPER_MODE !== 'off',
  };
}

function cachedLoad(cache: Map<string, { at: number; value: LoadedConnection | null }>, k: string, where: { id: string } | { webhookKey: string }) {
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  return load(where).then((value) => {
    if (cache.size > 2000) cache.clear();
    cache.set(k, { at: Date.now(), value });
    return value;
  });
}

export function connectionByKey(webhookKey: string): Promise<LoadedConnection | null> {
  return cachedLoad(byKey, webhookKey, { webhookKey });
}

export function connectionById(id: string): Promise<LoadedConnection | null> {
  return cachedLoad(byId, id, { id });
}

export function invalidateConnection(): void {
  byKey.clear();
  byId.clear();
}

/**
 * Public URL a provider must call for this connection (also the URL Twilio signs).
 * Uses runtime settings: NEXT_PUBLIC_* values are fixed at build time.
 */
export function webhookUrl(provider: CloudProvider, webhookKey: string): string {
  const env = process.env;
  const base = (env.PUBLIC_WEBHOOK_BASE_URL || env.BETTER_AUTH_URL || env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:9002').replace(/\/$/, '');
  return `${base}/api/webhooks/whatsapp/${provider}/${webhookKey}`;
}
