'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';
import { z } from 'zod';
import { normalizePhone } from '@/core/extract';
import { createApiKey } from '@/server/api-keys';
import { prisma } from '@/server/db';
import { getSessionUser, type SessionUser } from '@/server/session';

async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

const LangSchema = z.enum(['en', 'pidgin']);
const LevelSchema = z.enum(['SUSPICIOUS', 'LIKELY_SCAM', 'DANGEROUS']);

// ---------------------------------------------------------------- profile & preferences

export async function completeOnboarding(input: { businessName?: string; language?: string }) {
  const user = await requireUser();
  const businessName = (input.businessName ?? '').trim().slice(0, 120) || null;
  const language = LangSchema.safeParse(input.language).success ? (input.language as 'en' | 'pidgin') : 'en';
  await prisma.user.update({ where: { id: user.id }, data: { businessName, language } });
  if (businessName && user.orgId) await prisma.organization.update({ where: { id: user.orgId }, data: { name: businessName } });
  return { ok: true };
}

export async function updateProfile(input: { name: string; businessName?: string }) {
  const user = await requireUser();
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: 'Name is required' };
  const businessName = (input.businessName ?? '').trim().slice(0, 120) || null;
  await prisma.user.update({ where: { id: user.id }, data: { name, businessName } });
  if (businessName && user.orgId) await prisma.organization.update({ where: { id: user.orgId }, data: { name: businessName } });
  revalidatePath('/app', 'layout');
  return { ok: true };
}

export async function updatePreferences(input: { language?: string; alertThreshold?: string }) {
  const user = await requireUser();
  const data: { language?: string; alertThreshold?: string } = {};
  if (LangSchema.safeParse(input.language).success) data.language = input.language;
  if (LevelSchema.safeParse(input.alertThreshold).success) data.alertThreshold = input.alertThreshold;
  await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true };
}

// ---------------------------------------------------------------- chat linking

/** One-time code the user sends to the WhatsApp/Telegram bot ("link ABC123") to connect chats to this account. */
export async function createLinkCode() {
  const user = await requireUser();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  await prisma.linkCode.create({ data: { code, userId: user.id, expiresAt: new Date(Date.now() + 15 * 60_000) } });
  return { code, expiresInMinutes: 15 };
}

// ---------------------------------------------------------------- Guardian (linked WhatsApp)

export interface GuardianStatus {
  id: string | null;
  status: string;
  desiredState: string;
  phone: string | null;
  pairingCode: string | null;
  qrDataUrl: string | null;
  lastError: string | null;
  scanGroups: boolean;
  consentAt: string | null;
  lastSeenAt: string | null;
}

export async function getGuardianStatus(): Promise<GuardianStatus> {
  const user = await requireUser();
  const s = await prisma.waSession.findFirst({ where: { kind: 'GUARDIAN', ownerUserId: user.id }, orderBy: { createdAt: 'desc' } });
  if (!s) {
    return { id: null, status: 'none', desiredState: 'stopped', phone: null, pairingCode: null, qrDataUrl: null, lastError: null, scanGroups: false, consentAt: null, lastSeenAt: null };
  }
  const showQr = s.qr && s.status !== 'connected' && s.desiredState === 'running';
  return {
    id: s.id,
    status: s.status,
    desiredState: s.desiredState,
    phone: s.phone,
    pairingCode: s.status === 'pairing' ? s.pairingCode : null,
    qrDataUrl: showQr ? await QRCode.toDataURL(s.qr!, { margin: 1, width: 280 }) : null,
    lastError: s.lastError,
    scanGroups: s.scanGroups,
    consentAt: s.consentAt?.toISOString() ?? null,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
  };
}

export async function startGuardian(input: { phone: string; consent: boolean; scanGroups?: boolean }) {
  const user = await requireUser();
  if (!input.consent) return { ok: false, error: 'Please accept the consent to continue.' };
  const phone = normalizePhone(input.phone.trim().startsWith('+') ? input.phone : input.phone.replace(/^\+?/, ''));
  if (!phone) return { ok: false, error: 'Enter your WhatsApp number, e.g. 0803 123 4567.' };

  const existing = await prisma.waSession.findFirst({ where: { kind: 'GUARDIAN', ownerUserId: user.id } });
  const data = {
    phone,
    desiredState: 'running',
    status: 'pending',
    qr: null,
    pairingCode: null,
    lastError: null,
    consentAt: new Date(),
    scanGroups: Boolean(input.scanGroups),
  };
  if (existing) {
    // A different number means a different device link: drop old keys.
    if (existing.phone !== phone) await prisma.waAuthKey.deleteMany({ where: { sessionId: existing.id } });
    await prisma.waSession.update({ where: { id: existing.id }, data });
  } else {
    await prisma.waSession.create({ data: { ...data, kind: 'GUARDIAN', ownerUserId: user.id } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { phone } });
  return { ok: true };
}

export async function setGuardianState(state: 'running' | 'stopped' | 'logout') {
  const user = await requireUser();
  await prisma.waSession.updateMany({ where: { kind: 'GUARDIAN', ownerUserId: user.id }, data: { desiredState: state } });
  return { ok: true };
}

export async function updateGuardianOptions(input: { scanGroups: boolean }) {
  const user = await requireUser();
  await prisma.waSession.updateMany({ where: { kind: 'GUARDIAN', ownerUserId: user.id }, data: { scanGroups: Boolean(input.scanGroups) } });
  return { ok: true };
}

// ---------------------------------------------------------------- alerts

export async function markAlertsRead() {
  const user = await requireUser();
  await prisma.alert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath('/app/dashboard');
  return { ok: true };
}

// ---------------------------------------------------------------- web push

const PushSchema = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function savePushSubscription(sub: unknown) {
  const user = await requireUser();
  const parsed = PushSchema.safeParse(sub);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });
  return { ok: true };
}

// ---------------------------------------------------------------- API keys

export async function createApiKeyAction(name: string) {
  const user = await requireUser();
  const clean = name.trim().slice(0, 60) || 'API key';
  const key = await createApiKey(clean, { userId: user.id, orgId: user.orgId ?? undefined });
  revalidatePath('/app/settings');
  return { key };
}

export async function revokeApiKey(id: string) {
  const user = await requireUser();
  await prisma.apiKey.updateMany({ where: { id, userId: user.id }, data: { revokedAt: new Date() } });
  revalidatePath('/app/settings');
  return { ok: true };
}

// ---------------------------------------------------------------- emergency contacts (panic)

export async function addEmergencyContact(input: { name: string; phone: string }) {
  const user = await requireUser();
  const phone = normalizePhone(input.phone);
  const name = input.name.trim().slice(0, 60);
  if (!phone || !name) return { ok: false, error: 'Enter a name and a valid phone number.' };
  const count = await prisma.emergencyContact.count({ where: { userId: user.id } });
  if (count >= 5) return { ok: false, error: 'You can save up to 5 emergency contacts.' };
  await prisma.emergencyContact.create({ data: { userId: user.id, name, phone } });
  revalidatePath('/app/panic');
  return { ok: true };
}

export async function removeEmergencyContact(id: string) {
  const user = await requireUser();
  await prisma.emergencyContact.deleteMany({ where: { id, userId: user.id } });
  revalidatePath('/app/panic');
  return { ok: true };
}
