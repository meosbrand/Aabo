/**
 * @fileoverview Webhook payload parsing. Only messages addressed to the connection's own number
 * are accepted; delivery statuses are ignored.
 */

import type { CloudInbound } from './types';

type Json = Record<string, unknown>;

const obj = (x: unknown): Json => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Json) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);

export interface ParsedWebhook {
  messages: CloudInbound[];
  /** Messages for another phone number (ignored). */
  foreign: number;
}

/** Meta WhatsApp Cloud API / 360dialog (same format). */
export function parseCloudPayload(body: unknown, phoneNumberId: string): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], foreign: 0 };
  for (const entry of arr(obj(body).entry)) {
    for (const change of arr(obj(entry).changes)) {
      const value = obj(obj(change).value);
      const msgs = arr(value.messages);
      if (!msgs.length) continue;
      if (str(obj(value.metadata).phone_number_id) !== phoneNumberId) {
        out.foreign += msgs.length;
        continue;
      }
      const names = new Map<string, string>();
      for (const c of arr(value.contacts)) {
        const id = str(obj(c).wa_id);
        const name = str(obj(obj(c).profile).name);
        if (id && name) names.set(id, name);
      }
      for (const m of msgs.map(obj)) {
        const id = str(m.id);
        const from = str(m.from);
        if (!id || !from) continue;
        const ctx = obj(m.context);
        const msg: CloudInbound = {
          providerMessageId: id,
          from,
          name: names.get(from),
          timestamp: Number(m.timestamp) > 0 ? Number(m.timestamp) * 1000 : Date.now(),
          isForwarded: ctx.forwarded === true || ctx.frequently_forwarded === true,
        };
        const type = str(m.type);
        if (type === 'text') msg.text = str(obj(m.text).body);
        else if (type === 'image') {
          const img = obj(m.image);
          msg.text = str(img.caption);
          if (str(img.id)) msg.media = { kind: 'image', ref: str(img.id)!, mime: str(img.mime_type) };
        } else if (type === 'document') {
          const doc = obj(m.document);
          msg.text = str(doc.caption);
          msg.media = { kind: 'document', ref: str(doc.id) ?? '', mime: str(doc.mime_type), fileName: str(doc.filename) ?? 'document' };
        } else if (type === 'contacts') {
          const c = obj(arr(m.contacts)[0]);
          const phones = arr(c.phones).map((p) => str(obj(p).phone) ?? str(obj(p).wa_id)).filter((p): p is string => Boolean(p));
          msg.contact = { name: str(obj(c.name).formatted_name), phones };
        } else if (type === 'interactive') {
          const i = obj(m.interactive);
          msg.text = str(obj(i.button_reply).title) ?? str(obj(i.list_reply).title);
        } else if (type === 'button') {
          msg.text = str(obj(m.button).text);
        } else {
          msg.unsupported = true;
        }
        out.messages.push(msg);
      }
    }
  }
  return out;
}

/** Twilio WhatsApp webhook (form-encoded). `number` is the connection's sender in E.164. */
export function parseTwilioForm(params: URLSearchParams, expect: { accountSid: string; number: string }): ParsedWebhook {
  const sid = params.get('MessageSid') ?? params.get('SmsMessageSid');
  const from = params.get('From') ?? '';
  if (!sid || !from.startsWith('whatsapp:')) return { messages: [], foreign: 0 };
  if (params.get('AccountSid') !== expect.accountSid || params.get('To') !== `whatsapp:${expect.number}`) return { messages: [], foreign: 1 };
  const msg: CloudInbound = {
    providerMessageId: sid,
    from: from.slice('whatsapp:'.length),
    name: params.get('ProfileName') ?? undefined,
    timestamp: Date.now(),
    text: params.get('Body') || undefined,
    isForwarded: params.get('Forwarded') === 'true' || params.get('FrequentlyForwarded') === 'true',
  };
  if (Number(params.get('NumMedia') ?? '0') > 0) {
    const url = params.get('MediaUrl0') ?? '';
    const mime = params.get('MediaContentType0') ?? undefined;
    if (url) msg.media = mime?.startsWith('image/') ? { kind: 'image', ref: url, mime } : { kind: 'document', ref: url, mime, fileName: params.get('MediaFileName0') ?? 'attachment' };
  }
  return { messages: [msg], foreign: 0 };
}
