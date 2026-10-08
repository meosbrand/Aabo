/**
 * @fileoverview Transport-neutral chat types. Nothing above the adapters knows which
 * library carries the message, so the official WhatsApp Cloud API can be added later as
 * another adapter (WHATSAPP_TRANSPORT=cloud) without touching the router.
 */

export type ChannelName = 'whatsapp' | 'telegram' | 'fake';

export interface InboundMessage {
  channel: ChannelName;
  /** Where replies go. */
  chatId: string;
  /** Stable sender address (equal to chatId in 1:1 chats). */
  senderId: string;
  senderName?: string;
  /** E.164 phone when the transport exposes it. */
  senderPhone?: string;
  messageId: string;
  timestamp: number;
  text?: string;
  isForwarded?: boolean;
  isGroup?: boolean;
  /** Text of the message being replied to, if any. */
  quotedText?: string;
  image?: { base64: string; mime: string };
  document?: { fileName: string; mime?: string };
  contact?: { name?: string; phones: string[] };
}

export interface ChannelAdapter {
  readonly name: ChannelName;
  start(onMessage: (msg: InboundMessage) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(chatId: string, text: string): Promise<void>;
  /** Optional "typing…" indicator. */
  typing?(chatId: string): Promise<void>;
}
