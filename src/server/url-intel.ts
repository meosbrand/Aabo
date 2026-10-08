/**
 * @fileoverview Network URL intelligence: Google Safe Browsing, URLhaus, RDAP domain age
 * and SSRF-safe unshortening. Every source is optional and fails closed (returns nothing).
 * Keys come from the platform (env) or from an organisation's Developer Mode settings.
 */

import { createHash } from 'node:crypto';
import { SHORTENERS } from '@/core/lists';
import type { UrlFeedHit, UrlIntel } from '@/core/types';
import { cached } from './intel-cache';
import { guardedFetch, isPrivateAddress } from './net/safe-fetch';

export { isPrivateAddress };

const TIMEOUT_MS = 4000;
const HOUR = 3_600_000;

export interface UrlIntelKeys {
  safeBrowsing?: string | null;
  urlhaus?: string | null;
}

function networkEnabled(): boolean {
  return process.env.INTEL_NETWORK_LOOKUPS !== '0';
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

class LookupFailed extends Error {}

async function safeBrowsing(url: string, key: string): Promise<UrlFeedHit[]> {
  const res = await fetchWithTimeout('https://safebrowsing.googleapis.com/v4/threatMatches:find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      client: { clientId: 'aabo', clientVersion: '0.3.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
  });
  if (!res.ok) throw new LookupFailed(`safebrowsing ${res.status}`);
  const body = (await res.json()) as { matches?: Array<{ threatType: string }> };
  return (body.matches ?? []).map((m) => ({ source: 'safebrowsing', threat: m.threatType }));
}

async function urlhaus(url: string, key: string): Promise<UrlFeedHit[]> {
  const res = await fetchWithTimeout('https://urlhaus-api.abuse.ch/v1/url/', {
    method: 'POST',
    headers: { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url }).toString(),
  });
  if (!res.ok) throw new LookupFailed(`urlhaus ${res.status}`);
  const body = (await res.json()) as { query_status?: string; threat?: string };
  return body.query_status === 'ok' ? [{ source: 'urlhaus', threat: body.threat || 'MALWARE_DOWNLOAD' }] : [];
}

const shortLinkFetch = guardedFetch({ redirect: 'manual', maxBytes: 64 * 1024 });

export class NetworkUrlIntel implements UrlIntel {
  private readonly sbKey: string | null;
  private readonly uhKey: string | null;
  private readonly keyFp: string;

  /** Keys default to the platform's (GOOGLE_SAFE_BROWSING_API_KEY, URLHAUS_AUTH_KEY). */
  constructor(keys: UrlIntelKeys = {}) {
    this.sbKey = (keys.safeBrowsing === undefined ? process.env.GOOGLE_SAFE_BROWSING_API_KEY : keys.safeBrowsing) || null;
    this.uhKey = (keys.urlhaus === undefined ? process.env.URLHAUS_AUTH_KEY : keys.urlhaus) || null;
    this.keyFp = createHash('sha256').update(`${this.sbKey ?? ''}|${this.uhKey ?? ''}`).digest('hex').slice(0, 8);
  }

  async feeds(url: string): Promise<UrlFeedHit[]> {
    if (!networkEnabled() || (!this.sbKey && !this.uhKey)) return [];
    let failed = false;
    const run = async () => {
      const results = await Promise.allSettled([this.sbKey ? safeBrowsing(url, this.sbKey) : [], this.uhKey ? urlhaus(url, this.uhKey) : []]);
      failed = results.some((r) => r.status === 'rejected');
      return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    };
    const hits = await cached(`feeds:${this.keyFp}:${url}`, 6 * HOUR, async () => {
      const value = await run();
      // A failed lookup is not an answer: don't remember it.
      if (failed && !value.length) throw new LookupFailed('no source answered');
      return value;
    }).catch(() => [] as UrlFeedHit[]);
    return hits;
  }

  async domainCreated(domain: string): Promise<Date | null> {
    if (!networkEnabled()) return null;
    const iso = await cached<string | null>(`rdap:${domain}`, 7 * 24 * HOUR, async () => {
      const res = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { headers: { Accept: 'application/rdap+json' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new LookupFailed(`rdap ${res.status}`);
      const body = (await res.json()) as { events?: Array<{ eventAction: string; eventDate: string }> };
      return body.events?.find((e) => e.eventAction === 'registration')?.eventDate ?? null;
    }).catch(() => null);
    return iso ? new Date(iso) : null;
  }

  /** Follows redirects only while the current host is a known shortener. Never fetches the destination. */
  async unshorten(url: string): Promise<string | null> {
    if (!networkEnabled()) return null;
    return cached<string | null>(`unshorten:${url}`, 24 * HOUR, async () => {
      let current = url;
      for (let hop = 0; hop < 3; hop++) {
        let u: URL;
        try {
          u = new URL(current);
        } catch {
          return null;
        }
        const host = u.hostname.toLowerCase().replace(/^www\./, '');
        if (!SHORTENERS.has(host)) return hop === 0 ? null : current;
        if (u.protocol === 'http:') u.protocol = 'https:';
        try {
          const res = await shortLinkFetch(u.href, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
          const location = res.headers.get('location');
          if (!location || res.status < 300 || res.status >= 400) return hop === 0 ? null : current;
          current = new URL(location, u).href;
        } catch {
          return hop === 0 ? null : current;
        }
      }
      return current;
    }).catch(() => null);
  }
}

/** Shared instance using the platform's keys. */
export const urlIntel = new NetworkUrlIntel();
