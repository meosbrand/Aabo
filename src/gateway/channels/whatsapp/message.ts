/**
 * Maps a Baileys message to the transport-neutral InboundMessage.
 */

import type { WAMessage, WASocket, proto } from '@whiskeysockets/baileys';
import type { InboundMessage } from '../types';
import type { Baileys } from './baileys';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function phoneFromJid(b: Baileys, jid?: string | null): string | undefined {
  if (!jid || !b.isPnUser(jid)) return undefined;
  const user = b.jidDecode(jid)?.user;
  return user && /^\d{7,15}$/.test(user) ? `+${user}` : undefined;
}

function textOf(content: proto.IMessage | null | undefined): string | undefined {
  if (!content) return undefined;
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    content.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    undefined
  ) || undefined;
}

function contextOf(content: proto.IMessage): proto.IContextInfo | null | undefined {
  return (
    content.extendedTextMessage?.contextInfo ??
    content.imageMessage?.contextInfo ??
    content.videoMessage?.contextInfo ??
    content.documentMessage?.contextInfo ??
    content.contactMessage?.contextInfo
  );
}

function phonesFromVcard(vcard?: string | null): string[] {
  if (!vcard) return [];
  return [...vcard.matchAll(/TEL[^:]*:([+\d\s()-]{7,})/gi)].map((m) => m[1].replace(/[^\d+]/g, ''));
}

/** True for chats we never process (status updates, broadcasts, channels). */
export function ignoredJid(b: Baileys, jid?: string | null): boolean {
  return !jid || Boolean(b.isJidStatusBroadcast(jid) || b.isJidBroadcast(jid) || b.isJidNewsletter(jid));
}

export async function toInbound(b: Baileys, sock: WASocket, m: WAMessage, opts: { downloadImages: boolean }): Promise<InboundMessage | null> {
  const chatId = m.key.remoteJid;
  if (ignoredJid(b, chatId) || !m.message) return null;
  const content = b.normalizeMessageContent(m.message);
  if (!content || content.protocolMessage || content.reactionMessage) return null;

  const isGroup = Boolean(b.isJidGroup(chatId!));
  const senderJid = isGroup ? m.key.participant : chatId;
  const senderAlt = isGroup ? m.key.participantAlt : m.key.remoteJidAlt;
  const ctx = contextOf(content);
  const quoted = ctx?.quotedMessage ? textOf(b.normalizeMessageContent(ctx.quotedMessage)) : undefined;

  const msg: InboundMessage = {
    channel: 'whatsapp',
    chatId: chatId!,
    senderId: b.jidNormalizedUser(senderAlt && b.isPnUser(senderAlt) ? senderAlt : senderJid ?? chatId!),
    senderName: m.pushName ?? undefined,
    senderPhone: phoneFromJid(b, senderAlt) ?? phoneFromJid(b, senderJid),
    messageId: m.key.id ?? `${Date.now()}`,
    timestamp: Number(m.messageTimestamp ?? Date.now() / 1000) * 1000,
    text: textOf(content),
    isForwarded: Boolean(ctx?.isForwarded),
    isGroup,
    quotedText: quoted,
  };

  const doc = content.documentMessage ?? content.documentWithCaptionMessage?.message?.documentMessage;
  if (doc) msg.document = { fileName: doc.fileName ?? 'document', mime: doc.mimetype ?? undefined };

  const img = content.imageMessage;
  if (img && opts.downloadImages && Number(img.fileLength ?? 0) <= MAX_IMAGE_BYTES) {
    try {
      const buf = (await b.downloadMediaMessage(m, 'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage })) as Buffer;
      msg.image = { base64: buf.toString('base64'), mime: img.mimetype ?? 'image/jpeg' };
    } catch {
      // Media expired or failed to decrypt — fall back to the caption.
    }
  }

  const vcard = content.contactMessage?.vcard;
  const vcards = content.contactsArrayMessage?.contacts?.map((c) => c.vcard) ?? [];
  const phones = [vcard, ...vcards].flatMap((v) => phonesFromVcard(v));
  if (phones.length) msg.contact = { name: content.contactMessage?.displayName ?? undefined, phones };

  return msg;
}
