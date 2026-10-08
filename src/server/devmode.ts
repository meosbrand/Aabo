/**
 * @fileoverview Developer Mode: an organisation brings its own AI provider, threat-intel keys and
 * (later) WhatsApp API. All rules live here so web actions stay thin:
 *   - toggling Developer Mode: owner only; editing integrations: owner or admin; members: nothing
 *   - secrets are sealed before they touch the database and never returned (only a hint)
 *   - every change is written to the audit log (never secret values)
 * Gateway-safe: no Next.js imports.
 */

import { z } from 'zod';
import { AI_PRESETS, isAiProviderId } from '@/lib/ai-presets';
import { AiConfigError, buildAiConfig, platformAiConfig, type AiConfig } from './ai/config';
import { testAiConnection } from './ai/test-connection';
import type { AiTestResult } from '@/lib/developer-types';
import type { AuditView, DevCode, DeveloperOverview, IntegrationView } from '@/lib/developer-types';
import { prisma } from './db';
import { engineInfo, loadEngine } from './engine-loader';
import { developerModeAllowed, invalidateOrgSettings, type IntegrationKind } from './integrations';
import { roleAtLeast, type OrgActor, type OrgRole } from './org-auth';
import { rateLimit } from './rate-limit-store';
import { hintOf, integrationAad, open, seal, secretsAvailable } from './secrets/crypto';

export type DevResult<T extends object = object> = ({ ok: true } & T) | { ok: false; code: DevCode; message?: string };

export type { AuditView, DevCode, DeveloperOverview, IntegrationView };

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
  const [org, rows, events] = await Promise.all([
    prisma.organization.findUnique({ where: { id: actor.orgId }, select: { name: true, developerMode: true } }),
    prisma.orgIntegration.findMany({ where: { orgId: actor.orgId }, orderBy: { kind: 'asc' } }),
    prisma.auditEvent.findMany({ where: { orgId: actor.orgId }, orderBy: { createdAt: 'desc' }, take: 20 }),
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

/** Build (and validate) the BYOK configuration a draft describes. */
async function byokConfig(orgId: string, input: AiIntegrationInput): Promise<DevResult<{ cfg: AiConfig; key: string }>> {
  const key = input.clearKey ? '' : input.apiKey?.trim() || (await storedSecret(orgId, 'ai')) || '';
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
