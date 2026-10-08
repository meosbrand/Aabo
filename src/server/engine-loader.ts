/**
 * @fileoverview Loads the detection engine the app shell runs.
 *
 *   AABO_ENGINE=community (default)  the open community engine bundled with this repository
 *   AABO_ENGINE=module               a separately distributed engine; AABO_ENGINE_MODULE is a
 *                                    package name or a path to its built entry file
 *   AABO_ENGINE_REQUIRED=1           fail instead of falling back to the community engine
 *
 * No Next.js or Prisma imports: the gateway, scripts and tests use this module too.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_API_VERSION, type EngineModule, type FeedPolicy, type GuardianPolicy, type ReputationPolicy, type ScanEngine } from '@/core/engine';
import { DEFAULT_REPUTATION_POLICY } from '@/core/reputation-memory';
import { createCommunityEngine } from '@/engines/community';
import { basicGuardianPolicy } from '@/engines/community/guardian';
import { COMMUNITY_FEED_POLICY } from '@/engines/community/policies';

export interface EngineInfo {
  id: string;
  version: string;
  /** What was asked for (AABO_ENGINE). */
  requested: string;
  /** True when the requested engine failed to load and the community engine runs instead. */
  fallback: boolean;
  error?: string;
}

let loading: Promise<ScanEngine> | null = null;
let info: EngineInfo | null = null;

function required(): boolean {
  return process.env.AABO_ENGINE_REQUIRED === '1';
}

export function isScanEngine(e: unknown): e is ScanEngine {
  const x = e as Partial<ScanEngine> | null;
  return Boolean(
    x &&
      typeof x === 'object' &&
      typeof x.id === 'string' &&
      typeof x.version === 'string' &&
      typeof x.analyze === 'function' &&
      x.apiVersion === ENGINE_API_VERSION,
  );
}

/** Resolve a module spec: relative/absolute paths become file URLs, package names stay as they are. */
function moduleUrl(spec: string): string {
  if (spec.startsWith('file:')) return spec;
  if (spec.startsWith('.') || path.isAbsolute(spec)) return pathToFileURL(path.resolve(process.cwd(), spec)).href;
  return spec;
}

export async function importEngineModule(spec: string): Promise<ScanEngine> {
  const mod = (await import(/* webpackIgnore: true */ moduleUrl(spec))) as Partial<EngineModule> & { default?: Partial<EngineModule> };
  const em = typeof mod.createEngine === 'function' ? mod : mod.default;
  if (!em || typeof em.createEngine !== 'function') throw new Error('module does not export createEngine()');
  if (em.apiVersion !== ENGINE_API_VERSION) throw new Error(`engine API ${String(em.apiVersion)} is not supported (expected ${ENGINE_API_VERSION})`);
  const engine = await em.createEngine();
  if (!isScanEngine(engine)) throw new Error('createEngine() did not return a valid engine');
  return engine;
}

let builtin: ScanEngine | null = null;

/** The engine bundled with this repository (also the fallback when another engine fails). */
export async function builtinEngine(): Promise<ScanEngine> {
  if (!builtin) builtin = createCommunityEngine();
  return builtin;
}

async function load(): Promise<ScanEngine> {
  const requested = (process.env.AABO_ENGINE || 'community').trim();
  let engine: ScanEngine | null = null;
  let error: string | undefined;

  if (requested === 'module') {
    const spec = process.env.AABO_ENGINE_MODULE?.trim();
    if (!spec) error = 'AABO_ENGINE_MODULE is not set';
    else {
      try {
        engine = await importEngineModule(spec);
      } catch (err) {
        error = (err as Error).message;
      }
    }
  } else if (requested !== 'community') {
    error = requested === 'remote' ? 'remote engines are not supported yet' : `unknown AABO_ENGINE "${requested}"`;
  }

  if (error) {
    if (required()) throw new Error(`[aabo] detection engine "${requested}" failed to load: ${error}`);
    console.error(`[aabo] detection engine "${requested}" failed to load (${error}); using the community engine.`);
  }
  if (!engine) engine = await builtinEngine();
  info = { id: engine.id, version: engine.version, requested, fallback: Boolean(error), error };
  return engine;
}

/** The engine for this process (loaded once). */
export function loadEngine(): Promise<ScanEngine> {
  if (!loading) {
    loading = load().catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

/** Details of the loaded engine, or null before the first load. */
export function engineInfo(): EngineInfo | null {
  return info;
}

export async function reputationPolicy(): Promise<ReputationPolicy> {
  return (await loadEngine()).reputation ?? DEFAULT_REPUTATION_POLICY;
}

export async function feedPolicy(): Promise<FeedPolicy> {
  return (await loadEngine()).feeds ?? COMMUNITY_FEED_POLICY;
}

export async function guardianPolicy(): Promise<GuardianPolicy> {
  return (await loadEngine()).guardian ?? basicGuardianPolicy;
}

/** Tests only: run a specific engine (null resets to normal loading). */
export function __setEngineForTests(engine: ScanEngine | null): void {
  if (!engine) {
    loading = null;
    info = null;
    return;
  }
  loading = Promise.resolve(engine);
  info = { id: engine.id, version: engine.version, requested: 'test', fallback: false };
}
