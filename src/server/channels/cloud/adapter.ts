/**
 * @fileoverview Reply target for one inbound message on an organisation's own WhatsApp number.
 */

import { logError } from '../../log';
import { markReadAndTyping, sendText } from './api';
import type { CloudConnection } from './types';

export class CloudWhatsAppAdapter {
  readonly name = 'whatsapp' as const;
  private typed = false;

  constructor(
    private readonly conn: CloudConnection,
    private readonly inboundMessageId?: string,
  ) {}

  async send(chatId: string, text: string): Promise<void> {
    await sendText(this.conn, chatId, text);
  }

  /** Read receipt + typing indicator, once per message, only when the organisation enabled it. */
  async typing(): Promise<void> {
    if (this.typed || !this.conn.readReceipts || !this.inboundMessageId) return;
    this.typed = true;
    await markReadAndTyping(this.conn, this.inboundMessageId).catch((err) => logError('cloud typing', err));
  }
}
