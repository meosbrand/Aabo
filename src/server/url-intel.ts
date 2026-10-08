/**
 * @fileoverview Network URL intelligence: Google Safe Browsing, URLhaus, RDAP domain age
 * and SSRF-safe unshortening. Every source is optional and fails closed (returns nothing).
 */

import { lookup } from 'node:dns/promises';
import { SHORTENERS } from '@/core/lists';
import type { UrlFeedHit, UrlIntel } from '@/core/types';
import { cached } from './intel-cache';
import { isPrivateAddress } from './net/safe-fetch';

export { isPrivateAddress };

const TIMEOUT_MS = 4000;
const HOUR = 3_600_000;

function networkEnabled(): boolean {
  return process.env.INTEL_NETWORK_LOOKUPS !== '0';
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

async function safeBrowsing(url: string): Promise<UrlFeedHit[]> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key) return [];
  const res = await fetchWithTimeout(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'aabo', clientVersion: '0.2.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { matches?: Array<{ threatType: string }> };
  return (body.matches ?? []).map((m) => ({ source: 'safebrowsing', threat: m.threatType }));
}

async function urlhaus(url: string): Promise<UrlFeedHit[]> {
  const key = process.env.URLHAUS_AUTH_KEY;
  if (!key) return [];
  const res = await fetchWithTimeout('https://urlhaus-api.abuse.ch/v1/url/', {
    method: 'POST',
    headers: { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url }).toString(),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { query_status?: string; threat?: string; url_status?: string };
  return body.query_status === 'ok' ? [{ source: 'urlhaus', threat: body.threat || 'MALWARE_DOWNLOAD' }] : [];
}

export class NetworkUrlIntel implements UrlIntel {
  async feeds(url: string): Promise<UrlFeedHit[]> {
    if (!networkEnabled()) return [];
    if (!process.env.GOOGLE_SAFE_BROWSING_API_KEY && !process.env.URLHAUS_AUTH_KEY) return [];
    return cached(`feeds:${url}`, 6 * HOUR, async () => {
      const results = await Promise.allSettled([safeBrowsing(url), urlhaus(url)]);
      return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    });
  }

  async domainCreated(domain: string): Promise<Date | null> {
    if (!networkEnabled()) return null;
    const iso = await cached<string | null>(`rdap:${domain}`, 7 * 24 * HOUR, async () => {
      try {
        const res = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
          headers: { Accept: 'application/rdap+json' },
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { events?: Array<{ eventAction: string; eventDate: string }> };
        return body.events?.find((e) => e.eventAction === 'registration')?.eventDate ?? null;
      } catch {
        return null;
      }
    });
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
        if (!['http:', 'https:'].includes(u.protocol) || !(await hostIsPublic(u.hostname))) return null;
        try {
          const res = await fetchWithTimeout(u.href, { method: 'HEAD', redirect: 'manual' });
          const location = res.headers.get('location');
          if (!location || res.status < 300 || res.status >= 400) return hop === 0 ? null : current;
          current = new URL(location, u).href;
        } catch {
          return hop === 0 ? null : current;
        }
      }
      return current;
    });
  }
}

export const urlIntel = new NetworkUrlIntel();
