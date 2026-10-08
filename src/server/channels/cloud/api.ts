/**
 * @fileoverview Calls to the WhatsApp provider APIs: send text, read receipt + typing, credential
 * checks, 360dialog webhook setup and image download. Provider errors become CloudError codes.
 */

import { guardedFetch } from '../../net/safe-fetch';
import { CloudError, type CloudConnection, type CloudErrorCode, type D360Credentials, type MetaCredentials, type TwilioCredentials } from './types';

const TIMEOUT_MS = 10_000;
const MAX_MEDIA = 5 * 1024 * 1024;
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const META_MEDIA_HOSTS = ['.fbsbx.com', '.facebook.com', '.whatsapp.net'];

/** Test-only base URL overrides (ignored in production). */
function override(name: string): string | null {
  return process.env.NODE_ENV !== 'production' ? process.env[name] || null : null;
}

export function graphBase(): string {
  return override('AABO_TEST_GRAPH_BASE') ?? `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || 'v26.0'}`;
}
export function twilioBase(): string {
  return override('AABO_TEST_TWILIO_BASE') ?? 'https://api.twilio.com/2010-04-01';
}
export function d360Base(): string {
  return override('AABO_TEST_D360_BASE') ?? 'https://waba-v2.360dialog.io';
}

async function call(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new CloudError('unreachable', (err as Error).name);
  }
}

/** Map a provider error response to a code (never keeps the provider's message). */
async function failure(res: Response): Promise<CloudError> {
  const body = (await res.json().catch(() => ({}))) as { error?: { code?: number; error_subcode?: number }; code?: number; meta?: { http_code?: number } };
  const code = body.error?.code ?? body.code;
  let out: CloudErrorCode = 'bad_response';
  if (res.status === 401 || res.status === 403 || code === 190 || code === 20003) out = 'auth_failed';
  else if (code === 131047 || code === 63016) out = 'outside_window';
  else if (code === 131026 || code === 131030 || code === 21211 || code === 21614 || code === 63003) out = 'invalid_recipient';
  else if (res.status === 429 || code === 130429 || code === 131056 || code === 80007 || code === 20429) out = 'rate_limited';
  else if (res.status === 404) out = 'not_found';
  else if (res.status >= 500) out = 'unreachable';
  return new CloudError(out, `HTTP ${res.status}${code ? ` code ${code}` : ''}`);
}

function chunks(text: string, size: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size / 2) cut = size;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  if (rest) out.push(rest);
  return out;
}

function twilioAuth(conn: CloudConnection): string {
  const c = conn.credentials as TwilioCredentials;
  const user = c.apiKeySid && c.apiKeySecret ? `${c.apiKeySid}:${c.apiKeySecret}` : `${conn.config.accountSid}:${c.authToken}`;
  return `Basic ${Buffer.from(user).toString('base64')}`;
}

function cloudHeaders(conn: CloudConnection): Record<string, string> {
  return conn.provider === 'd360'
    ? { 'D360-API-KEY': (conn.credentials as D360Credentials).apiKey, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${(conn.credentials as MetaCredentials).accessToken}`, 'Content-Type': 'application/json' };
}

function cloudMessagesUrl(conn: CloudConnection): string {
  return conn.provider === 'd360' ? `${d360Base()}/messages` : `${graphBase()}/${encodeURIComponent(conn.externalNumberId)}/messages`;
}

export async function sendText(conn: CloudConnection, to: string, text: string): Promise<void> {
  if (conn.provider === 'twilio') {
    for (const body of chunks(text, 1600)) {
      const form = new URLSearchParams({ To: `whatsapp:${to}`, Body: body });
      if (conn.config.messagingServiceSid) form.set('MessagingServiceSid', conn.config.messagingServiceSid);
      else form.set('From', `whatsapp:${conn.externalNumberId}`);
      const res = await call(`${twilioBase()}/Accounts/${encodeURIComponent(conn.config.accountSid ?? '')}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: twilioAuth(conn), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      if (!res.ok) throw await failure(res);
    }
    return;
  }
  for (const body of chunks(text, 4096)) {
    const res = await call(cloudMessagesUrl(conn), {
      method: 'POST',
      headers: cloudHeaders(conn),
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body, preview_url: false } }),
    });
    if (!res.ok) throw await failure(res);
  }
}

/** Mark the inbound message read and show "typing…" (Meta/360dialog only). */
export async function markReadAndTyping(conn: CloudConnection, messageId: string): Promise<void> {
  if (conn.provider === 'twilio') return;
  const res = await call(cloudMessagesUrl(conn), {
    method: 'POST',
    headers: cloudHeaders(conn),
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
  });
  if (!res.ok) throw await failure(res);
}

/** Check that the credentials work for this number. Returns the display number when known. */
export async function verifyCredentials(conn: CloudConnection): Promise<{ displayNumber: string | null }> {
  if (conn.provider === 'meta') {
    const res = await call(`${graphBase()}/${encodeURIComponent(conn.externalNumberId)}?fields=display_phone_number,verified_name`, { headers: cloudHeaders(conn) });
    if (!res.ok) throw await failure(res);
    const body = (await res.json().catch(() => ({}))) as { display_phone_number?: string; id?: string };
    if (body.id && body.id !== conn.externalNumberId) throw new CloudError('not_found', 'phone number id mismatch');
    return { displayNumber: body.display_phone_number ?? null };
  }
  if (conn.provider === 'twilio') {
    const res = await call(`${twilioBase()}/Accounts/${encodeURIComponent(conn.config.accountSid ?? '')}.json`, { headers: { Authorization: twilioAuth(conn) } });
    if (!res.ok) throw await failure(res);
    return { displayNumber: conn.externalNumberId };
  }
  const res = await call(`${d360Base()}/v1/configs/webhook`, { headers: cloudHeaders(conn) });
  if (!res.ok) throw await failure(res);
  return { displayNumber: null };
}

/** Point the 360dialog number's webhook at Ààbò, with the shared secret header. */
export async function configureD360Webhook(conn: CloudConnection, url: string): Promise<void> {
  const c = conn.credentials as D360Credentials;
  const res = await call(`${d360Base()}/v1/configs/webhook`, {
    method: 'POST',
    headers: cloudHeaders(conn),
    body: JSON.stringify({ url, headers: { 'x-aabo-webhook-secret': c.webhookSecret } }),
  });
  if (!res.ok) throw await failure(res);
}

async function readCapped(res: Response): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > MAX_MEDIA) throw new CloudError('bad_response', 'media too large');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_MEDIA) throw new CloudError('bad_response', 'media too large');
  return buf;
}

function hostAllowed(url: string, suffixes: string[]): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && suffixes.some((s) => u.hostname === s.slice(1) || u.hostname.endsWith(s));
  } catch {
    return false;
  }
}

const mediaFetch = guardedFetch({ redirect: 'manual', maxBytes: MAX_MEDIA });

/** Download an image (≤ 5 MB, png/jpeg/webp/gif). Returns null for anything else. */
export async function downloadImage(conn: CloudConnection, ref: string, mimeHint?: string): Promise<{ base64: string; mime: string } | null> {
  if (mimeHint && !IMAGE_MIMES.has(mimeHint)) return null;
  let data: Buffer;
  let mime = mimeHint ?? '';
  if (conn.provider === 'twilio') {
    // Twilio media URLs redirect to a CDN: follow at most 3 hops, dropping credentials on a host change.
    let url = ref;
    let auth: string | null = twilioAuth(conn);
    const first = new URL(ref).host;
    for (let hop = 0; ; hop++) {
      if (hop > 3) throw new CloudError('bad_response', 'too many redirects');
      const res = await mediaFetch(url, { headers: auth ? { Authorization: auth } : {}, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location')!, url).href;
        if (new URL(url).host !== first) auth = null;
        continue;
      }
      if (!res.ok) throw await failure(res);
      mime = res.headers.get('content-type')?.split(';')[0] ?? mime;
      data = await readCapped(res);
      break;
    }
  } else {
    const base = conn.provider === 'd360' ? d360Base() : graphBase();
    const info = await call(`${base}/${encodeURIComponent(ref)}`, { headers: cloudHeaders(conn) });
    if (!info.ok) throw await failure(info);
    const meta = (await info.json().catch(() => ({}))) as { url?: string; mime_type?: string; file_size?: number };
    if (!meta.url || (meta.file_size ?? 0) > MAX_MEDIA) return null;
    let url = meta.url;
    if (conn.provider === 'd360') {
      // 360dialog proxies Meta's media host.
      const u = new URL(meta.url);
      url = `${d360Base()}${u.pathname}${u.search}`;
    } else if (!override('AABO_TEST_GRAPH_BASE') && !hostAllowed(url, META_MEDIA_HOSTS)) {
      throw new CloudError('bad_response', 'unexpected media host');
    }
    const res = await call(url, { headers: cloudHeaders(conn) });
    if (!res.ok) throw await failure(res);
    mime = meta.mime_type ?? res.headers.get('content-type')?.split(';')[0] ?? mime;
    data = await readCapped(res);
  }
  if (!IMAGE_MIMES.has(mime)) return null;
  return { base64: data.toString('base64'), mime };
}
