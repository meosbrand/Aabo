/**
 * @fileoverview What the router needs from the outside world. Prisma-backed in production
 * (prisma-services.ts), in-memory in tests.
 */

import type { Lang, ScanInput, Verdict } from '@/core/types';

export interface Identity {
  id: string;
  channel: string;
  externalId: string;
  displayName?: string | null;
  phone?: string | null;
  userId?: string | null;
  language: Lang;
  tipsOptIn: boolean;
  blocked: boolean;
  lastScanId?: string | null;
  /** Quiz question waiting for an answer (kept in the database so any process can continue it). */
  pendingQuizId?: string | null;
  /** When the pending quiz expires (ms since epoch). */
  pendingQuizExpires?: number | null;
}

export interface LookupSummary {
  type: string;
  value: string;
  reports: number;
  confirmed: boolean;
  safe: boolean;
  category: string | null;
  label: string | null;
  verdict: Verdict;
}

export interface RouterServices {
  getIdentity(channel: string, externalId: string, info: { displayName?: string; phone?: string }): Promise<Identity>;
  updateIdentity(id: string, patch: Partial<Pick<Identity, 'language' | 'tipsOptIn' | 'lastScanId' | 'userId' | 'pendingQuizId' | 'pendingQuizExpires'>>): Promise<void>;
  /** Consume one free check; returns false when today's quota is used up. */
  consumeCheck(identity: Identity): Promise<{ ok: boolean; limit: number }>;
  scan(input: ScanInput, identity: Identity): Promise<{ scanId: string; verdict: Verdict; seenCount: number }>;
  getVerdict(scanId: string): Promise<Verdict | null>;
  report(scanId: string, identity: Identity): Promise<boolean>;
  markSafe(scanId: string): Promise<void>;
  lookup(raw: string): Promise<LookupSummary | null>;
  linkAccount(code: string, identity: Identity): Promise<{ ok: boolean; name?: string }>;
  /** Co-pilot answer, or null when the Co-pilot is not offered on this channel. */
  ask(question: string, identity: Identity): Promise<string | null>;
  recordQuiz(identity: Identity, quizId: string, correct: boolean): Promise<void>;
}
