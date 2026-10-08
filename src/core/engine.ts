/**
 * @fileoverview The detection-engine contract.
 *
 * The app shell (this open-source repository) talks to a detection engine only through this
 * interface. The open "community" engine lives in src/engines/community. The production engine
 * is distributed separately and loaded at runtime (see src/server/engine-loader.ts).
 */

import type { Category, EngineDeps, IndicatorType, Lang, Level, LlmRequest, ScanInput, Verdict } from './types';

export const ENGINE_API_VERSION = 1;

/** Prompt used when the engine asks an LLM for a second opinion. */
export interface ScamPromptPack {
  id: string;
  system: string;
  user(req: LlmRequest): string;
}

/** How community reports turn into reputation. */
export interface ReputationPolicy {
  /** Confidence of an unconfirmed community indicator after `reports` reports (0..1). */
  communityConfidence(reports: number): number;
  /** Confidence at or above which an indicator counts as confirmed. */
  confirmedAt: number;
  /** Confidence given when a reviewer confirms a report. */
  reviewerConfidence: number;
  /** Unconfirmed community indicators are hidden until they have this many reports. */
  minReportsToShow: number;
}

export interface FeedEntry {
  url: string;
  source: string;
  threat: 'phishing' | 'malware';
}

export interface IndicatorSeed {
  type: IndicatorType;
  value: string;
  category?: Category | null;
  source: string;
  confidence: number;
  label?: string | null;
}

/** How threat-feed entries become indicators. */
export interface FeedPolicy {
  indicators(entry: FeedEntry): IndicatorSeed[];
  pruneAfterDays: number;
}

/** A message seen by Guardian on a user's own WhatsApp. */
export interface GuardianMessage {
  chatId: string;
  senderId: string;
  senderName?: string;
  senderPhone?: string;
  text?: string;
  isGroup?: boolean;
  isForwarded?: boolean;
  document?: { fileName: string; mime?: string };
}

export interface GuardianPrefs {
  threshold: Level;
  language: Lang;
  scanGroups: boolean;
}

/** Engine-side Guardian behaviour; the shell enforces privacy and owner-only delivery. */
export interface GuardianPolicy {
  contextSize: number;
  contextTtlMs: number;
  dedupeMs: number;
  /** Build the scan input (or null to skip the message). */
  toScanInput(msg: GuardianMessage, history: string[]): ScanInput | null;
  /** Whether to alert the owner. The shell can only suppress alerts, never add them. */
  shouldAlert(verdict: Verdict, prefs: GuardianPrefs): boolean;
  /** Text of the private warning sent to the owner (the shell caps its length). */
  notice(verdict: Verdict, msg: GuardianMessage, prefs: GuardianPrefs): string;
}

export interface ScanEngine {
  readonly id: string;
  readonly version: string;
  readonly apiVersion: number;
  analyze(input: ScanInput, deps: EngineDeps): Promise<Verdict>;
  /** Prompt for a trusted (platform-operated) LLM. Never sent to customer BYOK endpoints. */
  llmPrompt?: ScamPromptPack;
  reputation?: ReputationPolicy;
  guardian?: GuardianPolicy;
  feeds?: FeedPolicy;
  /** Curated indicators to seed a fresh database with. */
  curatedIndicators?(): Promise<IndicatorSeed[]>;
}

/** What a loadable engine module must export. */
export interface EngineModule {
  apiVersion: number;
  createEngine(): ScanEngine | Promise<ScanEngine>;
}
