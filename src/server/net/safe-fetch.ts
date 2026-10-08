/**
 * @fileoverview Outbound HTTP to addresses chosen by users (BYOK AI endpoints, short links)
 * without letting them reach private networks (SSRF).
 *
 * - isPrivateAddress: loopback, private, link-local, CGNAT, documentation, multicast and
 *   reserved ranges, including IPv4 hidden in IPv6 (mapped, compatible, NAT64, 6to4).
 * - assertSafeEndpoint: https only, no credentials in the URL, standard ports, public DNS answers.
 * - guardedFetch: re-checks every address at connect time (no DNS rebinding), never follows
 *   redirects, drops unexpected headers and caps the response size.
 */

import dns, { type LookupAddress } from 'node:dns';
import { BlockList, isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

export class BlockedAddressError extends Error {
  readonly code = 'blocked_address';
  constructor(message: string) {
    super(message);
    this.name = 'BlockedAddressError';
  }
}

export class ResponseTooLargeError extends Error {
  readonly code = 'response_too_large';
  constructor(limit: number) {
    super(`response larger than ${limit} bytes`);
    this.name = 'ResponseTooLargeError';
  }
}

const V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const V6: Array<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['100::', 64],
  ['2001::', 32],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
];

const blocked = new BlockList();
for (const [net, prefix] of V4) blocked.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of V6) blocked.addSubnet(net, prefix, 'ipv6');

/** Expand an IPv6 address into 8 16-bit groups (handles "::" and a trailing dotted IPv4). */
function expandV6(addr: string): number[] | null {
  let a = addr;
  const dotted = a.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const p = dotted[1].split('.').map(Number);
    if (p.some((n) => n > 255)) return null;
    a = a.slice(0, -dotted[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const halves = a.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function v4From(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** Strip brackets and a zone id, lower-case. */
export function canonicalIp(ip: string): string {
  return ip.trim().replace(/^\[|\]$/g, '').replace(/%.*$/, '').toLowerCase();
}

/** True for any address that is not a normal public unicast address (and for non-addresses). */
export function isPrivateAddress(ip: string): boolean {
  const a = canonicalIp(ip);
  const family = isIP(a);
  if (family === 4) return blocked.check(a, 'ipv4');
  if (family !== 6) return true;
  const g = expandV6(a);
  if (!g) return true;
  const zeros = (n: number) => g.slice(0, n).every((x) => x === 0);
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible)
  if (zeros(5) && g[5] === 0xffff) return isPrivateAddress(v4From(g[6], g[7]));
  if (zeros(6) && (g[6] !== 0 || g[7] > 1)) return isPrivateAddress(v4From(g[6], g[7]));
  // NAT64 64:ff9b::/96 and 6to4 2002::/16 carry an IPv4 address too.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPrivateAddress(v4From(g[6], g[7]));
  if (g[0] === 0x2002) return isPrivateAddress(v4From(g[1], g[2]));
  return blocked.check(g.map((x) => x.toString(16)).join(':'), 'ipv6');
}

export interface EndpointPolicy {
  /** Operator-configured endpoints may live on the local network (e.g. Ollama). */
  allowPrivate?: boolean;
}

const verdicts = new Map<string, number>();
const VERDICT_TTL_MS = 60_000;

/** Throws BlockedAddressError unless the URL is safe to call for this policy. */
export async function assertSafeEndpoint(raw: string | URL, policy: EndpointPolicy = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedAddressError('not a valid URL');
  }
  if (url.username || url.password) throw new BlockedAddressError('credentials in the URL are not allowed');
  if (policy.allowPrivate) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new BlockedAddressError('only http(s) URLs are allowed');
    return url;
  }
  if (url.protocol !== 'https:') throw new BlockedAddressError('only https URLs are allowed');
  if (url.port && url.port !== '443' && url.port !== '8443') throw new BlockedAddressError('only ports 443 and 8443 are allowed');
  const host = canonicalIp(url.hostname);
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new BlockedAddressError('private or reserved address');
    return url;
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new BlockedAddressError('local hostname');
  }
  const cached = verdicts.get(host);
  if (cached && Date.now() - cached < VERDICT_TTL_MS) return url;
  const addrs = await dns.promises.lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((x) => isPrivateAddress(x.address))) throw new BlockedAddressError('host resolves to a private or reserved address');
  if (verdicts.size > 1000) verdicts.clear();
  verdicts.set(host, Date.now());
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** dns.lookup replacement used at connect time: refuses private answers. */
function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new BlockedAddressError(`${hostname} resolves to a private or reserved address`), { errno: 0 }), '');
    }
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
}

let publicAgent: Agent | null = null;
let privateAgent: Agent | null = null;

function agentFor(allowPrivate: boolean): Agent {
  if (allowPrivate) return (privateAgent ??= new Agent({ connections: 32 }));
  return (publicAgent ??= new Agent({ connections: 32, connect: { lookup: safeLookup as never } }));
}

const BASE_HEADERS = new Set(['authorization', 'content-type', 'accept', 'accept-encoding', 'user-agent', 'idempotency-key', 'api-key', 'content-length']);

export interface GuardedFetchOptions extends EndpointPolicy {
  /** Largest response body accepted (bytes). Default 2 MB. */
  maxBytes?: number;
  /** Extra request headers that may be sent (lower-case names). */
  allowHeaders?: string[];
}

function capped(res: Response, limit: number): Response {
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > limit) {
    void res.body?.cancel().catch(() => undefined);
    throw new ResponseTooLargeError(limit);
  }
  if (!res.body) return res;
  const reader = res.body.getReader();
  let seen = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(ctrl) {
      const { done, value } = await reader.read();
      if (done) return ctrl.close();
      seen += value.byteLength;
      if (seen > limit) {
        await reader.cancel().catch(() => undefined);
        return ctrl.error(new ResponseTooLargeError(limit));
      }
      ctrl.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

/** A fetch for user-chosen endpoints. Compatible with the OpenAI SDK's `fetch` option. */
export function guardedFetch(opts: GuardedFetchOptions = {}) {
  const allowed = new Set([...BASE_HEADERS, ...(opts.allowHeaders ?? []).map((h) => h.toLowerCase())]);
  const limit = opts.maxBytes ?? 2 * 1024 * 1024;
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const target = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = await assertSafeEndpoint(target, opts);
    const headers = new Headers();
    new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).forEach((value, name) => {
      if (allowed.has(name) || name.startsWith('x-stainless-')) headers.set(name, value);
    });
    const res = await undiciFetch(url, {
      method: init?.method ?? (input instanceof Request ? input.method : 'GET'),
      headers,
      body: (init?.body ?? undefined) as never,
      signal: init?.signal ?? undefined,
      redirect: 'error',
      dispatcher: agentFor(Boolean(opts.allowPrivate)),
    });
    return capped(res as unknown as Response, limit);
  };
}
