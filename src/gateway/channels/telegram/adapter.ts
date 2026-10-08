/**
 * Telegram channel (official Bot API via grammY) — free, no ban risk, same router as WhatsApp.
 */

import { Bot } from 'grammy';
import type { ChannelAdapter, InboundMessage } from '../types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Convert our WhatsApp-style formatting (*bold*, _italic_) to Telegram HTML. */
export function toTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g, '$1<i>$2</i>');
}

export class TelegramAdapter implements ChannelAdapter {
  readonly name = 'telegram' as const;
  private bot: Bot;

  constructor(private readonly token: string) {
    this.bot = new Bot(token);
  }

  async start(onMessage: (msg: InboundMessage) => Promise<void>): Promise<void> {
    this.bot.on('message', async (ctx) => {
      const m = ctx.message;
      const msg: InboundMessage = {
        channel: 'telegram',
        chatId: String(m.chat.id),
        senderId: String(m.from?.id ?? m.chat.id),
        senderName: [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || undefined,
        messageId: String(m.message_id),
        timestamp: m.date * 1000,
        text: m.text ?? m.caption,
        isForwarded: Boolean(m.forward_origin),
        isGroup: m.chat.type !== 'private',
        quotedText: m.reply_to_message?.text ?? m.reply_to_message?.caption,
      };
      if (m.document) msg.document = { fileName: m.document.file_name ?? 'document', mime: m.document.mime_type };
      if (m.contact) msg.contact = { name: m.contact.first_name, phones: [m.contact.phone_number] };
      if (m.photo?.length) {
        const best = m.photo[m.photo.length - 1];
        if ((best.file_size ?? 0) <= MAX_IMAGE_BYTES) {
          try {
            const file = await ctx.api.getFile(best.file_id);
            const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`);
            if (res.ok) msg.image = { base64: Buffer.from(await res.arrayBuffer()).toString('base64'), mime: 'image/jpeg' };
          } catch {
            // ignore: the caption (if any) is still checked
          }
        }
      }
      await onMessage(msg);
    });
    this.bot.catch((err) => console.error('[aabo] telegram error', err.message));
    await this.bot.init();
    console.log(`[aabo] telegram: running as @${this.bot.botInfo.username}`);
    void this.bot.start({ drop_pending_updates: true });
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  async send(chatId: string, text: string): Promise<void> {
    await this.bot.api.sendMessage(chatId, toTelegramHtml(text), { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  }

  async typing(chatId: string): Promise<void> {
    await this.bot.api.sendChatAction(chatId, 'typing').catch(() => undefined);
  }
}
