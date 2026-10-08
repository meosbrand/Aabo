/**
 * @fileoverview Shared types for the Ààbò detection engine.
 * The engine is pure TypeScript with injected dependencies so it runs the same in
 * the Next.js server, the messaging gateway and unit tests.
 */

export type Lang = 'en' | 'pidgin';

/** Traffic-light verdict levels, lowest to highest risk. */
export type Level = 'SAFE' | 'SUSPICIOUS' | 'LIKELY_SCAM' | 'DANGEROUS';

export const LEVELS: Level[] = ['SAFE', 'SUSPICIOUS', 'LIKELY_SCAM', 'DANGEROUS'];

export type Category =
  | 'account_takeover'
  | 'fake_alert'
  | 'impersonation'
  | 'phishing'
  | 'investment'
  | 'loan'
  | 'job'
  | 'giveaway'
  | 'bec'
  | 'advance_fee'
  | 'romance'
  | 'malware'
  | 'spam'
  | 'other';

export const CATEGORIES: readonly Category[] = [
  'account_takeover',
  'fake_alert',
  'impersonation',
  'phishing',
  'investment',
  'loan',
  'job',
  'giveaway',
  'bec',
  'advance_fee',
  'romance',
  'malware',
  'spam',
  'other',
];

/** Text in both supported languages. */
export interface Bilingual {
  en: string;
  pidgin: string;
}

export type ReasonSource = 'rule' | 'url' | 'feed' | 'reputation' | 'fingerprint' | 'llm' | 'file' | 'safe';

export const REASON_SOURCES: readonly ReasonSource[] = ['rule', 'url', 'feed', 'reputation', 'fingerprint', 'llm', 'file', 'safe'];

/** One explainable signal that contributed to (or reduced) the score. */
export interface Reason {
  id: string;
  /** 0..1 contribution. Negative values are "looks legitimate" signals. */
  weight: number;
  category?: Category;
  source: ReasonSource;
  text: Bilingual;
  /** Minimum level this signal forces, regardless of other signals or the LLM. */
  floor?: Level;
}

export type Channel = 'web' | 'share' | 'api' | 'whatsapp' | 'telegram' | 'guardian';

/** What the user (or Guardian) asks us to check. */
export interface ScanInput {
  text?: string;
  /** A single link to check (also extracted from `text`). */
  url?: string;
  /** A phone number to check (also extracted from `text`). */
  phone?: string;
  /** A bank account number to check. */
  account?: string;
  /** Screenshot as base64 (no data: prefix) plus its MIME type. */
  imageBase64?: string;
  imageMime?: string;
  /** Attached file metadata (WhatsApp documents). */
  fileName?: string;
  fileMime?: string;
  channel: Channel;
  /** Free text: how the message arrived ("WhatsApp from unknown number", "SMS"...). */
  context?: string;
  /** Recent messages of the same conversation (Guardian), oldest first. */
  conversation?: string[];
  /** Sender's phone, when known (Guardian / forwarded vCard). */
  senderPhone?: string;
  /** Whether the message was forwarded (WhatsApp flag). */
  isForwarded?: boolean;
  /** Whether the sender is in the user's contacts (lowers some risks). */
  senderIsContact?: boolean;
}

export interface ParsedUrl {
  /** As found (after de-obfuscation). */
  raw: string;
  /** Normalized absolute URL. */
  href: string;
  hostname: string;
  /** Registrable domain (eTLD+1), e.g. "gtbank.com". */
  domain: string | null;
  subdomain: string | null;
  publicSuffix: string | null;
  isIp: boolean;
}

/** Indicators pulled out of the input. */
export interface Extracted {
  /** Normalized text (NFKC, zero-width removed, de-obfuscated, homoglyphs folded, lower-cased). */
  text: string;
  /** Text as written but cleaned (for display and fingerprints). */
  clean: string;
  urls: ParsedUrl[];
  /** E.164 phone numbers. */
  phones: string[];
  /** 10-digit NUBAN-like account numbers. */
  accounts: string[];
  /** Naira amounts mentioned. */
  amounts: number[];
  emails: string[];
  wallets: string[];
  /** 6-digit codes (OTP-like). */
  codes: string[];
}

export interface VerdictIndicators {
  urls: string[];
  domains: string[];
  phones: string[];
  accounts: string[];
  emails: string[];
  wallets: string[];
  /** Domains the engine recognised as legitimate (never reported as scams). */
  trustedDomains?: string[];
}

export interface Verdict {
  level: Level;
  /** 0..100 */
  score: number;
  category: Category | null;
  reasons: Reason[];
  actions: Bilingual[];
  summary: Bilingual;
  indicators: VerdictIndicators;
  usedLlm: boolean;
  /** Engine-defined near-duplicate fingerprint of the message (opaque string), if any. */
  fingerprint: string | null;
  /** sha256 of the normalized content. */
  contentHash: string;
  /** Text read from a screenshot, when OCR ran. */
  ocrText?: string;
  /** Which engine produced the verdict (stamped by the app shell). */
  engine?: { id: string; version: string; fallback?: boolean };
}

// ---------------------------------------------------------------------------
// Injected dependencies
// ---------------------------------------------------------------------------

export type IndicatorType = 'phone' | 'account' | 'domain' | 'url' | 'wallet' | 'fingerprint' | 'email';

export interface IndicatorInfo {
  type: IndicatorType;
  value: string;
  category?: Category | null;
  source: string;
  /** 0..1 */
  confidence: number;
  reports: number;
  label?: string | null;
  safe?: boolean;
}

export interface FingerprintEntry {
  value: string;
  category?: Category | null;
  label?: string | null;
  confidence: number;
}

/** Crowd/curated reputation database (Truecaller-style). */
export interface ReputationStore {
  lookup(type: IndicatorType, value: string): Promise<IndicatorInfo | null>;
  fingerprints(): Promise<FingerprintEntry[]>;
}

export interface UrlFeedHit {
  source: string;
  threat: string;
}

/** Network-backed URL intelligence. Every method may return null when disabled. */
export interface UrlIntel {
  /** Reputation feeds (Safe Browsing, URLhaus). */
  feeds(url: string): Promise<UrlFeedHit[]>;
  /** Domain registration date (RDAP). */
  domainCreated(domain: string): Promise<Date | null>;
  /** Follow redirects of a short link safely; returns the final URL or null. */
  unshorten(url: string): Promise<string | null>;
}

export interface LlmRequest {
  text: string;
  context?: string;
  conversation?: string[];
  imageBase64?: string;
  imageMime?: string;
  /** Compact summary of the deterministic signals, for grounding. */
  signals: string[];
  ruleScore: number;
}

export interface LlmResult {
  riskScore: number;
  category: Category | null;
  redFlags: string[];
  explanationEn: string;
  explanationPidgin: string;
  /** Text read from the screenshot (when an image was sent). */
  extractedText?: string;
}

export interface LlmAnalyzer {
  analyze(req: LlmRequest): Promise<LlmResult | null>;
  /** True when the configured model can read images (screenshots). */
  readonly vision?: boolean;
  /** True for the platform's own model; false for a customer's BYOK endpoint. */
  readonly trusted?: boolean;
  readonly model?: string;
}

export interface EngineDeps {
  reputation?: ReputationStore;
  urlIntel?: UrlIntel;
  llm?: LlmAnalyzer;
  /** Force (true) or skip (false) the LLM; default decides by grey zone. */
  llmMode?: 'auto' | 'always' | 'never';
}
