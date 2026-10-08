/**
 * @fileoverview Developer Mode: an organisation brings its own AI provider, threat-intel keys and
 * (later) WhatsApp API. All rules live here so web actions stay thin:
 *   - toggling Developer Mode: owner only; editing integrations: owner or admin; members: nothing
 *   - secrets are sealed before they touch the database and never returned (only a hint)
 *   - every change is written to the audit log (never secret values)
 * Gateway-safe: no Next.js imports.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AI_PRESETS, isAiProviderId } from '@/lib/ai-presets';
import { AiConfigError, buildAiConfig, platformAiConfig, type AiConfig } from './ai/config';
import { testAiConnection } from './ai/test-connection';
import type { AiTestResult } from '@/lib/developer-types';
import type { AuditView, ConnectionSecrets, ConnectionView, DevCode, DeveloperOverview, IntegrationView, WhatsAppProvider } from '@/lib/developer-types';
import { configureD360Webhook, sendText, verifyCredentials } from './channels/cloud/api';
import { connectionById, invalidateConnection, webhookUrl, type LoadedConnection } from './channels/cloud/connections';
import { sha256Hex } from './channels/cloud/signature';
import { CloudError, type CloudConfig, type CloudCredentials, type CloudProvider, type D360Credentials } from './channels/cloud/types';
import { prisma } from './db';
import { engineInfo, loadEngine } from './engine-loader';
import { developerModeAllowed, invalidateOrgSettings, type IntegrationKind } from './integrations';
import { roleAtLeast, type OrgActor, type OrgRole } from './org-auth';
import { rateLimit } from './rate-limit-store';
import { connectionAad, hintOf, integrationAad, open, seal, secretsAvailable } from './secrets/crypto';

export type DevResult<T extends object = object> = ({ ok: true } & T) | { ok: false; code: DevCode; message?: string };

export type { AuditView, ConnectionSecrets, ConnectionView, DevCode, DeveloperOverview, IntegrationView };

const fail = (code: DevCode, message?: string) => ({ ok: false as const, code, ...(message ? { message } : {}) });

export async function audit(actor: OrgActor, action: string, target?: string | null): Promise<void> {
  await prisma.auditEvent.create({ data: { orgId: actor.orgId, actorUserId: actor.userId, action, target: target?.slice(0, 200) ?? null } });
}

function can(actor: OrgActor | null, min: OrgRole): actor is OrgActor {
  return Boolean(actor && roleAtLeast(actor.role, min));
}

async function editable(actor: OrgActor | null): Promise<DevResult<{ actor: OrgActor }>> {
  if (!can(actor, 'admin')) return fail('forbidden');
  if (!developerModeAllowed()) return fail('operator_off');
  if (!secretsAvailable()) return fail('secrets_unavailable');
  const org = await prisma.organization.findUnique({ where: { id: actor.orgId }, select: { developerMode: true } });
  if (!org?.developerMode) return fail('developer_mode_off');
  return { ok: true, actor };
}

export async function getDeveloperOverview(actor: OrgActor | null): Promise<DevResult<{ overview: DeveloperOverview }>> {
  if (!can(actor, 'admin')) return fail('forbidden');
  await loadEngine().catch(() => undefined);
  const [org, rows, events, connections] = await Promise.all([
    prisma.organization.findUnique({ where: { id: actor.orgId }, select: { name: true, developerMode: true } }),
    prisma.orgIntegration.findMany({ where: { orgId: actor.orgId }, orderBy: { kind: 'asc' } }),
    prisma.auditEvent.findMany({ where: { orgId: actor.orgId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    listConnections(actor.orgId),
  ]);
  if (!org) return fail('not_found');
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(events.map((e) => e.actorUserId))] } }, select: { id: true, name: true } });
  const platform = platformAiConfig();
  return {
    ok: true,
    overview: {
      role: actor.role,
      orgName: org.name,
      developerMode: org.developerMode && developerModeAllowed(),
      allowed: developerModeAllowed(),
      secretsAvailable: secretsAvailable(),
      platformAi: { available: Boolean(platform), provider: platform?.provider ?? null, model: platform?.model ?? null },
      engine: engineInfo(),
      integrations: rows.map((r) => ({
        kind: r.kind as IntegrationKind,
        config: (r.config ?? {}) as Record<string, unknown>,
        hint: r.secret ? r.hint ?? '…' : null,
        enabled: r.enabled,
        status: r.status,
        lastError: r.lastError,
        lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
        updatedAt: r.updatedAt.toISOString(),
      })),
      connections,
      audit: events.map((e) => ({
        action: e.action,
        target: e.target,
        actor: users.find((u) => u.id === e.actorUserId)?.name ?? 'Someone',
        createdAt: e.createdAt.toISOString(),
      })),
    },
  };
}

export async function setDeveloperMode(actor: OrgActor | null, on: boolean): Promise<DevResult> {
  if (!can(actor, 'owner')) return fail('forbidden');
  if (on && !developerModeAllowed()) return fail('operator_off');
  if (on && !secretsAvailable()) return fail('secrets_unavailable');
  await prisma.organization.update({
    where: { id: actor.orgId },
    data: on ? { developerMode: true, developerModeAt: new Date(), developerModeBy: actor.userId } : { developerMode: false },
  });
  await audit(actor, on ? 'developer_mode.on' : 'developer_mode.off');
  invalidateOrgSettings(actor.orgId);
  invalidateConnection();
  return { ok: true };
}

export const AiIntegrationInput = z.object({
  mode: z.enum(['platform', 'byok', 'off']),
  provider: z.string().max(40).optional(),
  baseURL: z.string().trim().max(500).optional(),
  model: z.string().trim().max(200).optional(),
  visionModel: z.string().trim().max(200).optional(),
  jsonMode: z.enum(['json_schema', 'json_object', 'prompt']).optional(),
  vision: z.boolean().nullable().optional(),
  temperature: z.union([z.number().min(0).max(2), z.literal('omit')]).nullable().optional(),
  timeoutMs: z.number().int().min(1000).max(120_000).optional(),
  /** New key; blank keeps the stored one. */
  apiKey: z.string().max(4000).optional(),
  /** Remove the stored key. */
  clearKey: z.boolean().optional(),
});
export type AiIntegrationInput = z.infer<typeof AiIntegrationInput>;

function aiSettingsFrom(input: AiIntegrationInput): Record<string, unknown> {
  const provider = isAiProviderId(input.provider) ? input.provider : 'custom';
  const out: Record<string, unknown> = { mode: input.mode, provider };
  if (input.baseURL) out.baseURL = input.baseURL;
  if (input.model) out.model = input.model;
  if (input.visionModel) out.visionModel = input.visionModel;
  if (input.jsonMode) out.jsonMode = input.jsonMode;
  if (typeof input.vision === 'boolean') out.vision = input.vision;
  if (input.temperature !== undefined && input.temperature !== null) out.temperature = input.temperature;
  if (input.timeoutMs) out.timeoutMs = input.timeoutMs;
  return out;
}

async function storedSecret(orgId: string, kind: IntegrationKind): Promise<string | null> {
  const row = await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind } }, select: { secret: true } });
  if (!row?.secret) return null;
  try {
    return open(row.secret, integrationAad(orgId, kind));
  } catch {
    return null;
  }
}

/** Where a set of AI settings sends requests (provider + URL origin). */
function aiDestination(cfg: { provider?: unknown; baseURL?: unknown }): string {
  const provider = isAiProviderId(cfg.provider) ? cfg.provider : 'custom';
  const url = (typeof cfg.baseURL === 'string' && cfg.baseURL.trim()) || AI_PRESETS[provider].baseURL;
  try {
    return `${provider}|${new URL(url).origin}`;
  } catch {
    return `${provider}|${url}`;
  }
}

/**
 * The stored key, but only for the provider and address it was entered for: a key never follows a
 * change of destination unless it is typed again (so nobody can redirect someone else's key).
 */
async function reusableKey(orgId: string, input: AiIntegrationInput): Promise<DevResult<{ key: string }>> {
  const row = await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind: 'ai' } }, select: { config: true, secret: true } });
  if (!row?.secret) return { ok: true, key: '' };
  if (aiDestination((row.config ?? {}) as Record<string, unknown>) !== aiDestination(input)) {
    return fail('invalid', 'Enter the API key again when you change the provider or the API address.');
  }
  return { ok: true, key: (await storedSecret(orgId, 'ai')) ?? '' };
}

/** Build (and validate) the BYOK configuration a draft describes. */
async function byokConfig(orgId: string, input: AiIntegrationInput): Promise<DevResult<{ cfg: AiConfig; key: string }>> {
  let key = '';
  if (!input.clearKey) {
    if (input.apiKey?.trim()) key = input.apiKey.trim();
    else {
      const stored = await reusableKey(orgId, input);
      if (!stored.ok) return stored;
      key = stored.key;
    }
  }
  try {
    const cfg = buildAiConfig({ ...aiSettingsFrom(input), apiKey: key } as never, 'byok', orgId);
    if (!cfg.allowPrivate && !cfg.baseURL.startsWith('https://')) return fail('invalid', 'The base URL must start with https://');
    return { ok: true, cfg, key };
  } catch (err) {
    return fail('invalid', err instanceof AiConfigError ? err.message : 'Invalid AI settings.');
  }
}

export async function saveAiIntegration(actor: OrgActor | null, raw: unknown): Promise<DevResult> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const parsed = AiIntegrationInput.safeParse(raw);
  if (!parsed.success) return fail('invalid', 'Some fields are not valid.');
  const input = parsed.data;
  const orgId = gate.actor.orgId;
  let secretData: { secret?: string | null; hint?: string | null } = {};
  if (input.mode === 'byok') {
    const built = await byokConfig(orgId, input);
    if (!built.ok) return built;
    if (input.clearKey) secretData = { secret: null, hint: null };
    else if (input.apiKey?.trim()) secretData = { secret: seal(built.key, integrationAad(orgId, 'ai')), hint: hintOf(built.key) };
  } else if (input.clearKey) {
    secretData = { secret: null, hint: null };
  }
  const config = aiSettingsFrom(input);
  await prisma.orgIntegration.upsert({
    where: { orgId_kind: { orgId, kind: 'ai' } },
    create: { orgId, kind: 'ai', config: config as object, createdBy: gate.actor.userId, status: 'unverified', ...secretData },
    update: { config: config as object, status: 'unverified', lastError: null, enabled: true, ...secretData },
  });
  await audit(gate.actor, 'ai.save', `${input.mode}${input.mode === 'byok' ? `:${config.provider}` : ''}${secretData.secret ? ' (new key)' : ''}`);
  invalidateOrgSettings(orgId);
  return { ok: true };
}

/** Test the stored AI settings, or a draft (merged with the stored key when the draft has none). */
export async function testAiIntegration(actor: OrgActor | null, draft?: unknown): Promise<DevResult<{ result: AiTestResult }>> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const orgId = gate.actor.orgId;
  const limit = await rateLimit(`devtest:${orgId}`, 10, 3_600_000);
  if (!limit.ok) return fail('rate_limited');

  let input: AiIntegrationInput;
  if (draft !== undefined) {
    const parsed = AiIntegrationInput.safeParse(draft);
    if (!parsed.success) return fail('invalid', 'Some fields are not valid.');
    input = parsed.data;
  } else {
    const row = await prisma.orgIntegration.findUnique({ where: { orgId_kind: { orgId, kind: 'ai' } } });
    if (!row) return fail('not_found');
    input = AiIntegrationInput.parse(row.config);
  }

  let cfg: AiConfig;
  if (input.mode === 'byok') {
    const built = await byokConfig(orgId, input);
    if (!built.ok) return built;
    cfg = built.cfg;
  } else {
    const platform = platformAiConfig();
    if (!platform) return fail('platform_ai_missing');
    cfg = { ...platform, orgId };
  }
  const result = await testAiConnection(cfg);
  if (draft === undefined && input.mode === 'byok') {
    await prisma.orgIntegration.updateMany({
      where: { orgId, kind: 'ai' },
      data: { status: result.ok ? 'verified' : 'error', lastError: result.ok ? null : result.code, lastUsedAt: new Date() },
    });
    invalidateOrgSettings(orgId);
  }
  await audit(gate.actor, 'ai.test', `${input.mode}:${result.code}`);
  return { ok: true, result };
}

export async function saveIntelKey(actor: OrgActor | null, kind: 'safebrowsing' | 'urlhaus', apiKey: string | null): Promise<DevResult> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  if (kind !== 'safebrowsing' && kind !== 'urlhaus') return fail('invalid');
  const orgId = gate.actor.orgId;
  const key = apiKey?.trim() ?? '';
  if (!key) {
    await prisma.orgIntegration.deleteMany({ where: { orgId, kind } });
    await audit(gate.actor, `${kind}.remove`);
  } else {
    if (key.length > 500 || !/^[\x21-\x7e]+$/.test(key)) return fail('invalid', 'That does not look like an API key.');
    const secret = seal(key, integrationAad(orgId, kind));
    await prisma.orgIntegration.upsert({
      where: { orgId_kind: { orgId, kind } },
      create: { orgId, kind, config: {}, secret, hint: hintOf(key), createdBy: gate.actor.userId },
      update: { secret, hint: hintOf(key), status: 'unverified', lastError: null, enabled: true },
    });
    await audit(gate.actor, `${kind}.save`);
  }
  invalidateOrgSettings(orgId);
  return { ok: true };
}

export async function removeIntegration(actor: OrgActor | null, kind: IntegrationKind): Promise<DevResult> {
  if (!can(actor, 'admin')) return fail('forbidden');
  await prisma.orgIntegration.deleteMany({ where: { orgId: actor.orgId, kind } });
  await audit(actor, `${kind}.remove`);
  invalidateOrgSettings(actor.orgId);
  return { ok: true };
}

/** Preset defaults for the settings form (no secrets). */
export function presetDefaults() {
  return AI_PRESETS;
}

// ---------------------------------------------------------------------------
// Bring-your-own WhatsApp numbers
// ---------------------------------------------------------------------------

const label = z.string().trim().min(1).max(60);
const phoneNumberId = z.string().trim().regex(/^\d{5,30}$/, 'Phone number ID is the long number from the WhatsApp Manager');
const limits = {
  dailyLimitPerUser: z.number().int().min(1).max(1000).optional(),
  orgDailyCap: z.number().int().min(1).max(100_000).optional(),
};

export const ConnectionInput = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('meta'),
    label,
    phoneNumberId,
    accessToken: z.string().trim().min(20).max(4000),
    appSecret: z.string().trim().regex(/^[A-Za-z0-9]{16,128}$/, 'App secret looks wrong'),
    ...limits,
  }),
  z.object({
    provider: z.literal('twilio'),
    label,
    accountSid: z.string().trim().regex(/^AC[0-9a-fA-F]{32}$/, 'Account SID starts with AC'),
    number: z.string().trim().regex(/^\+\d{8,15}$/, 'Use the full number, e.g. +2348012345678'),
    authToken: z.string().trim().regex(/^[0-9a-fA-F]{32}$/, 'Auth Token is 32 characters'),
    apiKeySid: z.string().trim().regex(/^SK[0-9a-fA-F]{32}$/).optional().or(z.literal('')),
    apiKeySecret: z.string().trim().max(200).optional(),
    messagingServiceSid: z.string().trim().regex(/^MG[0-9a-fA-F]{32}$/).optional().or(z.literal('')),
    ...limits,
  }),
  z.object({ provider: z.literal('d360'), label, phoneNumberId, apiKey: z.string().trim().min(10).max(500), ...limits }),
]);

export const ConnectionPatch = z.object({
  label: label.optional(),
  enabled: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
  copilotEnabled: z.boolean().optional(),
  tipsEnabled: z.boolean().optional(),
  ...limits,
});

function maskNumber(n: string): string {
  return n.length > 6 ? `${n.slice(0, 4)}…${n.slice(-3)}` : n;
}

function connectionView(row: {
  id: string;
  provider: string;
  label: string;
  externalNumberId: string;
  displayNumber: string | null;
  status: string;
  enabled: boolean;
  lastInboundAt: Date | null;
  lastError: string | null;
  dailyLimitPerUser: number;
  orgDailyCap: number;
  readReceipts: boolean;
  copilotEnabled: boolean;
  tipsEnabled: boolean;
  webhookKey: string;
  createdAt: Date;
}): ConnectionView {
  return {
    id: row.id,
    provider: row.provider as WhatsAppProvider,
    label: row.label,
    externalNumberId: row.externalNumberId,
    displayNumber: row.displayNumber,
    status: row.status,
    enabled: row.enabled,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    lastError: row.lastError,
    dailyLimitPerUser: row.dailyLimitPerUser,
    orgDailyCap: row.orgDailyCap,
    readReceipts: row.readReceipts,
    copilotEnabled: row.copilotEnabled,
    tipsEnabled: row.tipsEnabled,
    webhookUrl: webhookUrl(row.provider as CloudProvider, row.webhookKey),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConnections(orgId: string): Promise<ConnectionView[]> {
  const rows = await prisma.channelConnection.findMany({ where: { orgId }, orderBy: { createdAt: 'asc' } });
  return rows.map(connectionView);
}

const newKey = () => randomBytes(24).toString('base64url');

export async function createConnection(actor: OrgActor | null, raw: unknown): Promise<DevResult<{ connection: ConnectionView; secrets: ConnectionSecrets }>> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const parsed = ConnectionInput.safeParse(raw);
  if (!parsed.success) return fail('invalid', parsed.error.issues[0]?.message ?? 'Some fields are not valid.');
  const input = parsed.data;
  const orgId = gate.actor.orgId;
  const id = randomUUID();
  const webhookKey = newKey();
  const secrets: ConnectionSecrets = { webhookUrl: webhookUrl(input.provider, webhookKey) };
  let credentials: CloudCredentials;
  let config: CloudConfig = {};
  let externalNumberId: string;
  let inboundSecretHash: string | null = null;
  if (input.provider === 'meta') {
    secrets.verifyToken = newKey();
    inboundSecretHash = sha256Hex(secrets.verifyToken);
    credentials = { provider: 'meta', accessToken: input.accessToken, appSecret: input.appSecret };
    externalNumberId = input.phoneNumberId;
  } else if (input.provider === 'twilio') {
    credentials = {
      provider: 'twilio',
      authToken: input.authToken,
      ...(input.apiKeySid && input.apiKeySecret ? { apiKeySid: input.apiKeySid, apiKeySecret: input.apiKeySecret } : {}),
    };
    config = { accountSid: input.accountSid, ...(input.messagingServiceSid ? { messagingServiceSid: input.messagingServiceSid } : {}) };
    externalNumberId = input.number;
  } else {
    secrets.webhookSecret = newKey();
    inboundSecretHash = sha256Hex(secrets.webhookSecret);
    credentials = { provider: 'd360', apiKey: input.apiKey, webhookSecret: secrets.webhookSecret };
    externalNumberId = input.phoneNumberId;
  }
  try {
    const row = await prisma.channelConnection.create({
      data: {
        id,
        orgId,
        provider: input.provider,
        label: input.label,
        externalNumberId,
        config: config as object,
        secret: seal(JSON.stringify(credentials), connectionAad(orgId, id)),
        inboundSecretHash,
        webhookKey,
        dailyLimitPerUser: input.dailyLimitPerUser ?? 50,
        orgDailyCap: input.orgDailyCap ?? 1000,
        createdBy: gate.actor.userId,
      },
    });
    await audit(gate.actor, 'whatsapp.connect', `${input.provider}:${maskNumber(externalNumberId)}`);
    invalidateConnection();
    return { ok: true, connection: connectionView(row), secrets };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return fail('duplicate', 'This number is already connected.');
    throw err;
  }
}

async function ownConnection(actor: OrgActor, id: string): Promise<LoadedConnection | null> {
  const row = await prisma.channelConnection.findFirst({ where: { id, orgId: actor.orgId }, select: { id: true } });
  if (!row) return null;
  invalidateConnection();
  return connectionById(id);
}

/** Check the credentials with the provider; required before the number takes messages. */
export async function verifyConnection(actor: OrgActor | null, id: string): Promise<DevResult<{ connection: ConnectionView; manualSetup?: boolean }>> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const limit = await rateLimit(`devtest:${gate.actor.orgId}`, 10, 3_600_000);
  if (!limit.ok) return fail('rate_limited');
  const conn = await ownConnection(gate.actor, id);
  if (!conn) return fail('not_found');
  let manualSetup: boolean | undefined;
  try {
    const { displayNumber } = await verifyCredentials(conn);
    if (conn.provider === 'd360') {
      manualSetup = await configureD360Webhook(conn, webhookUrl('d360', conn.webhookKey)).then(
        () => false,
        () => true,
      );
    }
    await prisma.channelConnection.update({
      where: { id },
      data: { status: conn.status === 'active' ? 'active' : 'verified', lastError: manualSetup ? 'webhook_setup_failed' : null, ...(displayNumber ? { displayNumber } : {}) },
    });
    await audit(gate.actor, 'whatsapp.verify', `${conn.provider}:ok`);
  } catch (err) {
    const code = err instanceof CloudError ? err.code : 'unreachable';
    await prisma.channelConnection.update({ where: { id }, data: { status: conn.status === 'active' ? 'active' : 'error', lastError: code } });
    await audit(gate.actor, 'whatsapp.verify', `${conn.provider}:${code}`);
    invalidateConnection();
    return fail('provider_error', code);
  }
  invalidateConnection();
  const row = await prisma.channelConnection.findUniqueOrThrow({ where: { id } });
  return { ok: true, connection: connectionView(row), ...(manualSetup ? { manualSetup } : {}) };
}

export async function sendTestMessage(actor: OrgActor | null, id: string, to: string): Promise<DevResult> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const limit = await rateLimit(`devtest:${gate.actor.orgId}`, 10, 3_600_000);
  if (!limit.ok) return fail('rate_limited');
  const conn = await ownConnection(gate.actor, id);
  if (!conn) return fail('not_found');
  if (!['verified', 'active'].includes(conn.status)) return fail('not_verified');
  const digits = to.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return fail('invalid', 'Enter the number with its country code, e.g. 2348012345678.');
  try {
    await sendText(conn, conn.provider === 'twilio' ? `+${digits}` : digits, '✅ Ààbò test message: your WhatsApp number is connected.');
    await audit(gate.actor, 'whatsapp.test', `${conn.provider}:ok`);
    return { ok: true };
  } catch (err) {
    const code = err instanceof CloudError ? err.code : 'unreachable';
    await audit(gate.actor, 'whatsapp.test', `${conn.provider}:${code}`);
    return fail('provider_error', code);
  }
}

export async function updateConnection(actor: OrgActor | null, id: string, raw: unknown): Promise<DevResult> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const parsed = ConnectionPatch.safeParse(raw);
  if (!parsed.success) return fail('invalid', 'Some fields are not valid.');
  const res = await prisma.channelConnection.updateMany({ where: { id, orgId: gate.actor.orgId }, data: parsed.data });
  if (res.count !== 1) return fail('not_found');
  await audit(gate.actor, 'whatsapp.update', Object.keys(parsed.data).join(','));
  invalidateConnection();
  return { ok: true };
}

/** New webhook URL and inbound secret (the old ones stop working at once). */
export async function rotateConnection(actor: OrgActor | null, id: string): Promise<DevResult<{ secrets: ConnectionSecrets }>> {
  const gate = await editable(actor);
  if (!gate.ok) return gate;
  const conn = await ownConnection(gate.actor, id);
  if (!conn) return fail('not_found');
  const webhookKey = newKey();
  const secrets: ConnectionSecrets = { webhookUrl: webhookUrl(conn.provider, webhookKey) };
  const data: Prisma.ChannelConnectionUpdateInput = { webhookKey };
  if (conn.provider === 'meta') {
    secrets.verifyToken = newKey();
    data.inboundSecretHash = sha256Hex(secrets.verifyToken);
  } else if (conn.provider === 'd360') {
    secrets.webhookSecret = newKey();
    data.inboundSecretHash = sha256Hex(secrets.webhookSecret);
    const credentials = { ...(conn.credentials as D360Credentials), webhookSecret: secrets.webhookSecret };
    data.secret = seal(JSON.stringify(credentials), connectionAad(conn.orgId, conn.id));
    secrets.manualSetup = await configureD360Webhook({ ...conn, credentials }, secrets.webhookUrl).then(
      () => false,
      () => true,
    );
  }
  await prisma.channelConnection.update({ where: { id }, data });
  await audit(gate.actor, 'whatsapp.rotate', `${conn.provider}:${maskNumber(conn.externalNumberId)}`);
  invalidateConnection();
  return { ok: true, secrets };
}

export async function deleteConnection(actor: OrgActor | null, id: string): Promise<DevResult> {
  if (!can(actor, 'admin')) return fail('forbidden');
  const row = await prisma.channelConnection.findFirst({ where: { id, orgId: actor.orgId } });
  if (!row) return fail('not_found');
  await prisma.$transaction([prisma.inboundEvent.deleteMany({ where: { connectionId: id } }), prisma.channelConnection.delete({ where: { id } })]);
  await audit(actor, 'whatsapp.delete', `${row.provider}:${maskNumber(row.externalNumberId)}`);
  invalidateConnection();
  return { ok: true };
}
